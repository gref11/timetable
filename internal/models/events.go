// internal/models/event.go
package models

import (
	"time"
)

// Event представляет собой событие в расписании
type Event struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// NewEvent создает новое событие с автоматически сгенерированным ID и временем создания
func NewEvent(title string, startTime, endTime time.Time, tags []string) *Event {
	return &Event{
		ID:        generateID(),
		Title:     title,
		StartTime: startTime,
		EndTime:   endTime,
		Tags:      tags,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// Update обновляет поля события
func (e *Event) Update(title string, startTime, endTime time.Time, tags []string) {
	e.Title = title
	e.StartTime = startTime
	e.EndTime = endTime
	e.Tags = tags
	e.UpdatedAt = time.Now()
}

// Validate проверяет корректность данных события
func (e *Event) Validate() error {
	if e.Title == "" {
		return ValidationError{Field: "title", Message: "Название не может быть пустым"}
	}

	if e.StartTime.After(e.EndTime) {
		return ValidationError{Field: "endTime", Message: "Время окончания не может быть раньше времени начала"}
	}

	return nil
}

// ValidationError представляет ошибку валидации
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e ValidationError) Error() string {
	return e.Message
}

// Вспомогательная функция для генерации ID (упрощенная версия)
func generateID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(6)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
