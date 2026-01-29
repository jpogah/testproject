"""In-memory task storage with CRUD operations."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import uuid4


@dataclass
class Task:
    """Represents a task in the storage system."""
    title: str
    description: str = ""
    completed: bool = False
    id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class TaskStorage:
    """In-memory storage for tasks with CRUD operations."""

    def __init__(self):
        self._tasks: dict[str, Task] = {}

    def create(self, title: str, description: str = "") -> Task:
        """Create a new task and return it."""
        task = Task(title=title, description=description)
        self._tasks[task.id] = task
        return task

    def get(self, task_id: str) -> Optional[Task]:
        """Get a task by ID. Returns None if not found."""
        return self._tasks.get(task_id)

    def get_all(self) -> list[Task]:
        """Get all tasks."""
        return list(self._tasks.values())

    def update(self, task_id: str, title: str = None, description: str = None,
               completed: bool = None) -> Optional[Task]:
        """Update a task. Returns the updated task or None if not found."""
        task = self._tasks.get(task_id)
        if task is None:
            return None

        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if completed is not None:
            task.completed = completed
        task.updated_at = datetime.now()

        return task

    def delete(self, task_id: str) -> bool:
        """Delete a task. Returns True if deleted, False if not found."""
        if task_id in self._tasks:
            del self._tasks[task_id]
            return True
        return False

    def count(self) -> int:
        """Return the number of tasks in storage."""
        return len(self._tasks)
