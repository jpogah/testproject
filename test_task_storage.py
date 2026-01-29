"""Tests for in-memory task storage."""

import pytest
from task_storage import Task, TaskStorage


class TestTask:
    def test_task_creation(self):
        task = Task(title="Test task", description="A test")
        assert task.title == "Test task"
        assert task.description == "A test"
        assert task.completed is False
        assert task.id is not None
        assert task.created_at is not None

    def test_task_has_unique_id(self):
        task1 = Task(title="Task 1")
        task2 = Task(title="Task 2")
        assert task1.id != task2.id


class TestTaskStorage:
    def test_create_task(self):
        storage = TaskStorage()
        task = storage.create("My task", "Description")
        assert task.title == "My task"
        assert task.description == "Description"
        assert storage.count() == 1

    def test_get_task(self):
        storage = TaskStorage()
        created = storage.create("My task")
        retrieved = storage.get(created.id)
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.title == "My task"

    def test_get_nonexistent_task(self):
        storage = TaskStorage()
        result = storage.get("nonexistent-id")
        assert result is None

    def test_get_all_tasks(self):
        storage = TaskStorage()
        storage.create("Task 1")
        storage.create("Task 2")
        storage.create("Task 3")
        tasks = storage.get_all()
        assert len(tasks) == 3

    def test_update_task(self):
        storage = TaskStorage()
        task = storage.create("Original title")
        updated = storage.update(task.id, title="Updated title", completed=True)
        assert updated is not None
        assert updated.title == "Updated title"
        assert updated.completed is True

    def test_update_nonexistent_task(self):
        storage = TaskStorage()
        result = storage.update("nonexistent-id", title="New title")
        assert result is None

    def test_delete_task(self):
        storage = TaskStorage()
        task = storage.create("To be deleted")
        assert storage.count() == 1
        result = storage.delete(task.id)
        assert result is True
        assert storage.count() == 0
        assert storage.get(task.id) is None

    def test_delete_nonexistent_task(self):
        storage = TaskStorage()
        result = storage.delete("nonexistent-id")
        assert result is False

    def test_count(self):
        storage = TaskStorage()
        assert storage.count() == 0
        storage.create("Task 1")
        assert storage.count() == 1
        storage.create("Task 2")
        assert storage.count() == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
