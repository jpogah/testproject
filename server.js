const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory storage for tasks
let tasks = [];
let nextId = 1;

// GET /tasks - List all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// POST /tasks - Create a new task
app.post('/tasks', (req, res) => {
  const { title, description, completed } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const task = {
    id: nextId++,
    title,
    description: description || '',
    completed: completed || false,
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  res.status(201).json(task);
});

// GET /tasks/:id - Get a specific task
app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// PUT /tasks/:id - Update a specific task
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, description, completed } = req.body;
  const existingTask = tasks[taskIndex];

  tasks[taskIndex] = {
    ...existingTask,
    title: title !== undefined ? title : existingTask.title,
    description: description !== undefined ? description : existingTask.description,
    completed: completed !== undefined ? completed : existingTask.completed,
    updatedAt: new Date().toISOString()
  };

  res.json(tasks[taskIndex]);
});

// DELETE /tasks/:id - Delete a specific task
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(taskIndex, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Task API server running on port ${PORT}`);
});
