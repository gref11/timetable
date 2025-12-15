// internal/storage/storage.go
package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"schedule-app/internal/models"
	"sort"
	"strings"
	"sync"
	"time"
)

// Storage представляет файловое хранилище для событий
type Storage struct {
	mu       sync.RWMutex
	filePath string
	events   map[string]*models.Event
}

// NewStorage создает новое хранилище
func NewStorage(filePath string) (*Storage, error) {
	storage := &Storage{
		filePath: filePath,
		events:   make(map[string]*models.Event),
	}

	// Создаем директорию, если она не существует
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("не удалось создать директорию: %w", err)
	}

	// Загружаем данные из файла
	if err := storage.load(); err != nil {
		// Если файл не существует, создаем пустой
		if os.IsNotExist(err) {
			if err := storage.save(); err != nil {
				return nil, fmt.Errorf("не удалось создать файл данных: %w", err)
			}
			return storage, nil
		}
		return nil, fmt.Errorf("не удалось загрузить данные: %w", err)
	}

	return storage, nil
}

// GetAll возвращает все события
func (s *Storage) GetAll() ([]*models.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := make([]*models.Event, 0, len(s.events))
	for _, event := range s.events {
		events = append(events, event)
	}

	return events, nil
}

// GetByID возвращает событие по ID
func (s *Storage) GetByID(id string) (*models.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	event, exists := s.events[id]
	if !exists {
		return nil, fmt.Errorf("событие с ID %s не найдено", id)
	}

	return event, nil
}

// GetByDate возвращает события на определенную дату
// internal/storage/storage.go
// (добавляем после существующего кода)

// GetByDate возвращает события на определенную дату (включая целый день)
func (s *Storage) GetByDate(date time.Time) ([]*models.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var events []*models.Event
	year, month, day := date.Date()

	for _, event := range s.events {
		eventYear, eventMonth, eventDay := event.StartTime.Date()
		if year == eventYear && month == eventMonth && day == eventDay {
			events = append(events, event)
		}
	}

	// Сортируем события по времени начала
	sort.Slice(events, func(i, j int) bool {
		return events[i].StartTime.Before(events[j].StartTime)
	})

	return events, nil
}

// Create создает новое событие
func (s *Storage) Create(event *models.Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Проверяем, существует ли уже событие с таким ID
	if _, exists := s.events[event.ID]; exists {
		return fmt.Errorf("событие с ID %s уже существует", event.ID)
	}

	s.events[event.ID] = event
	return s.save()
}

// Update обновляет существующее событие
func (s *Storage) Update(event *models.Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.events[event.ID]; !exists {
		return fmt.Errorf("событие с ID %s не найдено", event.ID)
	}

	s.events[event.ID] = event
	return s.save()
}

// Delete удаляет событие по ID
func (s *Storage) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.events[id]; !exists {
		return fmt.Errorf("событие с ID %s не найдено", id)
	}

	delete(s.events, id)
	return s.save()
}

// Search ищет события по ключевым словам в заголовке
func (s *Storage) Search(query string) ([]*models.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []*models.Event
	for _, event := range s.events {
		if containsIgnoreCase(event.Title, query) {
			results = append(results, event)
		}
	}

	return results, nil
}

// load загружает данные из файла
func (s *Storage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	var events []*models.Event
	if err := json.Unmarshal(data, &events); err != nil {
		return fmt.Errorf("ошибка при разборе JSON: %w", err)
	}

	// Преобразуем срез в карту для быстрого доступа по ID
	s.events = make(map[string]*models.Event)
	for _, event := range events {
		s.events[event.ID] = event
	}

	return nil
}

// save сохраняет данные в файл
func (s *Storage) save() error {
	// Преобразуем карту в срез для сериализации
	events := make([]*models.Event, 0, len(s.events))
	for _, event := range s.events {
		events = append(events, event)
	}

	data, err := json.MarshalIndent(events, "", "  ")
	if err != nil {
		return fmt.Errorf("ошибка при сериализации JSON: %w", err)
	}

	// Создаем временный файл для безопасной записи
	tmpFile := s.filePath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return fmt.Errorf("ошибка при записи во временный файл: %w", err)
	}

	// Заменяем оригинальный файл временным
	if err := os.Rename(tmpFile, s.filePath); err != nil {
		return fmt.Errorf("ошибка при замене файла: %w", err)
	}

	return nil
}

// containsIgnoreCase проверяет, содержит ли строка подстроку (без учета регистра)
func containsIgnoreCase(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}

	// Используем стандартную библиотеку для корректной работы с Unicode
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
