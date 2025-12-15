// cmd/server/main.go
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"schedule-app/internal/storage"
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

	// Сохраняем хранилище в глобальной переменной (для упрощения)
	// В реальном проекте лучше использовать dependency injection
	globalStore = store

	// Настройка маршрутов
	http.HandleFunc("/", serveStatic)
	http.HandleFunc("/api/health", healthCheck)
	http.HandleFunc("/api/events", eventsHandler)

	// Запуск сервера
	port := ":8080"
	log.Printf("Сервер запущен на http://localhost%s", port)
	log.Fatal(http.ListenAndServe(port, nil))
}

var globalStore *storage.Storage

// healthCheck проверяет работоспособность сервера
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "ok", "service": "schedule-app"}`))
}

// serveStatic обслуживает статические файлы
func serveStatic(w http.ResponseWriter, r *http.Request) {
	// Определяем путь к файлу
	path := r.URL.Path
	if path == "/" {
		path = "/index.html"
	}

	// Проверяем существование файла
	fullPath := filepath.Join("static", path)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		// Если файл не найден, возвращаем index.html для SPA-роутинга
		fullPath = filepath.Join("static", "index.html")
	}

	http.ServeFile(w, r, fullPath)
}

// eventsHandler обрабатывает запросы к API событий (заглушка для Этапа 1)
func eventsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		events, err := globalStore.GetAll()
		if err != nil {
			http.Error(w, `{"error": "Не удалось получить события"}`, http.StatusInternalServerError)
			return
		}

		// Временный ответ для тестирования
		w.Write([]byte(`{"message": "Events API работает", "total": "` + string(len(events)) + `"}`))

	case "POST", "PUT", "DELETE":
		w.WriteHeader(http.StatusNotImplemented)
		w.Write([]byte(`{"message": "Метод пока не реализован"}`))

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		w.Write([]byte(`{"error": "Метод не разрешен"}`))
	}
}
