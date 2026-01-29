package main

import "time"

// TaskStatus represents the possible states of a task
type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
)

// Task represents a task in the system
type Task struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      TaskStatus `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
}

// NewTask creates a new Task with the given title and description
func NewTask(id, title, description string) *Task {
	return &Task{
		ID:          id,
		Title:       title,
		Description: description,
		Status:      TaskStatusPending,
		CreatedAt:   time.Now(),
	}
}
