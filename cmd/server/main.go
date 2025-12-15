// cmd/server/main.go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"schedule-app/internal/models"
	"schedule-app/internal/storage"
	"strconv"
	"strings"
	"time"
)

func main() {
	// Инициализация хранилища
	storagePath := "data/events.json"
	if err := os.MkdirAll(filepath.Dir(storagePath), 0755); err != nil {
		log.Fatalf("Ошибка при создании директории данных: %v", err)
	}

	store, err := storage.NewStorage(storagePath)
	if err != nil {
		log.Fatalf("Ошибка при инициализации хранилища: %v", err)
	}

	// Сохраняем хранилище в глобальной переменной
	globalStore = store

	// Настройка маршрутов с использованием роутера
	mux := http.NewServeMux()

	// API маршруты
	mux.HandleFunc("/api/health", healthCheck)
	mux.HandleFunc("/api/events", eventsHandler)
	mux.HandleFunc("/api/events/", eventByIDHandler)
	mux.HandleFunc("/api/events/date/", eventsByDateHandler)
	mux.HandleFunc("/api/events/search/", eventsSearchHandler)

	// Статические файлы
	mux.HandleFunc("/", serveStatic)

	// Middleware для логирования и CORS
	handler := corsMiddleware(loggingMiddleware(mux))

	// Запуск сервера
	port := ":8080"
	log.Printf("Сервер запущен на http://localhost%s", port)
	log.Fatal(http.ListenAndServe(port, handler))
}

var globalStore *storage.Storage

// ================== Middleware ==================

// loggingMiddleware логирует все запросы
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
	})
}

// corsMiddleware добавляет CORS заголовки
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Устанавливаем заголовки CORS
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Обрабатываем preflight запросы
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ================== Вспомогательные функции ==================

// writeJSON отправляет JSON ответ
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Ошибка при отправке JSON: %v", err)
		http.Error(w, `{"error": "Внутренняя ошибка сервера"}`, http.StatusInternalServerError)
	}
}

// writeError отправляет ошибку в формате JSON
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// parseIDFromPath извлекает ID из URL пути
func parseIDFromPath(r *http.Request) (string, error) {
	path := strings.TrimPrefix(r.URL.Path, "/api/events/")
	if path == "" {
		return "", fmt.Errorf("ID не указан")
	}
	return path, nil
}

// parseDateFromPath извлекает дату из URL пути
func parseDateFromPath(r *http.Request) (time.Time, error) {
	path := strings.TrimPrefix(r.URL.Path, "/api/events/date/")
	if path == "" {
		return time.Now(), nil
	}

	// Пробуем несколько форматов даты
	layouts := []string{"2006-01-02", "2006-01-02T15:04:05", "2006-01-02 15:04:05"}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, path); err == nil {
			return t, nil
		}
	}

	// Если не удалось распарсить, возвращаем текущую дату
	return time.Now(), fmt.Errorf("неверный формат даты")
}

// ================== Обработчики API ==================

// healthCheck проверяет работоспособность сервера
func healthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Метод не разрешен")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"service": "schedule-app",
		"time":    time.Now().Format(time.RFC3339),
	})
}

// eventsHandler обрабатывает запросы к коллекции событий
func eventsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getAllEvents(w, r)
	case http.MethodPost:
		createEvent(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Метод не разрешен")
	}
}

// eventByIDHandler обрабатывает запросы к конкретному событию по ID
func eventByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ID события не указан")
		return
	}

	// Удаляем возможные дополнительные сегменты пути
	idParts := strings.Split(id, "/")
	id = idParts[0]

	switch r.Method {
	case http.MethodGet:
		getEventByID(w, r, id)
	case http.MethodPut:
		updateEvent(w, r, id)
	case http.MethodDelete:
		deleteEvent(w, r, id)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Метод не разрешен")
	}
}

// eventsByDateHandler обрабатывает запросы на получение событий по дате
func eventsByDateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Метод не разрешен")
		return
	}

	date, err := parseDateFromPath(r)
	if err != nil {
		// Если дата не указана, используем текущую дату
		date = time.Now()
	}

	getEventsByDate(w, r, date)
}

// eventsSearchHandler обрабатывает поиск событий
func eventsSearchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Метод не разрешен")
		return
	}

	query := strings.TrimPrefix(r.URL.Path, "/api/events/search/")
	if query == "" {
		// Если поисковый запрос не указан в пути, проверяем параметр запроса
		query = r.URL.Query().Get("q")
	}

	searchEvents(w, r, query)
}

// ================== Реализации CRUD операций ==================

// getAllEvents возвращает все события
func getAllEvents(w http.ResponseWriter, r *http.Request) {
	events, err := globalStore.GetAll()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось получить события")
		return
	}

	// Применяем фильтры, если они указаны
	filteredEvents := events

	// Фильтр по дате (параметр запроса ?date=YYYY-MM-DD)
	if dateStr := r.URL.Query().Get("date"); dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			var dateEvents []*models.Event
			for _, event := range events {
				if event.StartTime.Year() == date.Year() &&
					event.StartTime.Month() == date.Month() &&
					event.StartTime.Day() == date.Day() {
					dateEvents = append(dateEvents, event)
				}
			}
			filteredEvents = dateEvents
		}
	}

	// Фильтр по тегу (параметр запроса ?tag=работа)
	if tag := r.URL.Query().Get("tag"); tag != "" {
		var tagEvents []*models.Event
		for _, event := range filteredEvents {
			for _, eventTag := range event.Tags {
				if strings.EqualFold(eventTag, tag) {
					tagEvents = append(tagEvents, event)
					break
				}
			}
		}
		filteredEvents = tagEvents
	}

	// Ограничение количества (параметр запроса ?limit=10)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit < len(filteredEvents) {
			filteredEvents = filteredEvents[:limit]
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"events": filteredEvents,
		"count":  len(filteredEvents),
	})
}

// getEventByID возвращает событие по ID
func getEventByID(w http.ResponseWriter, r *http.Request, id string) {
	event, err := globalStore.GetByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Событие не найдено")
		return
	}

	writeJSON(w, http.StatusOK, event)
}

// getEventsByDate возвращает события на указанную дату
func getEventsByDate(w http.ResponseWriter, r *http.Request, date time.Time) {
	events, err := globalStore.GetByDate(date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось получить события")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"events": events,
		"date":   date.Format("2006-01-02"),
		"count":  len(events),
	})
}

// searchEvents выполняет поиск событий
func searchEvents(w http.ResponseWriter, r *http.Request, query string) {
	if query == "" {
		writeError(w, http.StatusBadRequest, "Поисковый запрос не может быть пустым")
		return
	}

	events, err := globalStore.Search(query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Ошибка при выполнении поиска")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"events": events,
		"query":  query,
		"count":  len(events),
	})
}

// createEvent создает новое событие
func createEvent(w http.ResponseWriter, r *http.Request) {
	// Парсим тело запроса
	var requestData struct {
		Title     string    `json:"title"`
		StartTime time.Time `json:"startTime"`
		EndTime   time.Time `json:"endTime"`
		Tags      []string  `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		writeError(w, http.StatusBadRequest, "Неверный формат JSON")
		return
	}

	// Валидация обязательных полей
	if requestData.Title == "" {
		writeError(w, http.StatusBadRequest, "Название события обязательно")
		return
	}

	if requestData.StartTime.IsZero() || requestData.EndTime.IsZero() {
		writeError(w, http.StatusBadRequest, "Время начала и окончания обязательно")
		return
	}

	// Создаем новое событие
	event := models.NewEvent(
		requestData.Title,
		requestData.StartTime,
		requestData.EndTime,
		requestData.Tags,
	)

	// Валидация события
	if err := event.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Сохраняем в хранилище
	if err := globalStore.Create(event); err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось создать событие")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Событие успешно создано",
		"event":   event,
	})
}

// updateEvent обновляет существующее событие
func updateEvent(w http.ResponseWriter, r *http.Request, id string) {
	// Получаем существующее событие
	existingEvent, err := globalStore.GetByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Событие не найдено")
		return
	}

	// Парсим тело запроса
	var requestData struct {
		Title     *string    `json:"title"`
		StartTime *time.Time `json:"startTime"`
		EndTime   *time.Time `json:"endTime"`
		Tags      []string   `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		writeError(w, http.StatusBadRequest, "Неверный формат JSON")
		return
	}

	// Обновляем только переданные поля (частичное обновление)
	title := existingEvent.Title
	if requestData.Title != nil {
		title = *requestData.Title
	}

	startTime := existingEvent.StartTime
	if requestData.StartTime != nil {
		startTime = *requestData.StartTime
	}

	endTime := existingEvent.EndTime
	if requestData.EndTime != nil {
		endTime = *requestData.EndTime
	}

	tags := existingEvent.Tags
	if requestData.Tags != nil {
		tags = requestData.Tags
	}

	// Обновляем событие
	existingEvent.Update(title, startTime, endTime, tags)

	// Валидация обновленного события
	if err := existingEvent.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Сохраняем изменения
	if err := globalStore.Update(existingEvent); err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось обновить событие")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Событие успешно обновлено",
		"event":   existingEvent,
	})
}

// deleteEvent удаляет событие
func deleteEvent(w http.ResponseWriter, r *http.Request, id string) {
	// Проверяем, существует ли событие
	if _, err := globalStore.GetByID(id); err != nil {
		writeError(w, http.StatusNotFound, "Событие не найдено")
		return
	}

	// Удаляем событие
	if err := globalStore.Delete(id); err != nil {
		writeError(w, http.StatusInternalServerError, "Не удалось удалить событие")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Событие успешно удалено",
		"id":      id,
	})
}

// serveStatic обслуживает статические файлы
func serveStatic(w http.ResponseWriter, r *http.Request) {
	// Определяем путь к файлу
	path := r.URL.Path
	if path == "/" || path == "" {
		path = "/index.html"
	}

	// Проверяем существование файла
	fullPath := filepath.Join("static", path)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		// Если файл не найден, возвращаем index.html для SPA-роутинга
		fullPath = filepath.Join("static", "index.html")
	}

	// Устанавливаем правильный Content-Type в зависимости от расширения файла
	if strings.HasSuffix(path, ".css") {
		w.Header().Set("Content-Type", "text/css")
	} else if strings.HasSuffix(path, ".js") {
		w.Header().Set("Content-Type", "application/javascript")
	} else if strings.HasSuffix(path, ".html") {
		w.Header().Set("Content-Type", "text/html")
	}

	http.ServeFile(w, r, fullPath)
}
