const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for tasks
let tasks = [];
let nextId = 1;

// In-memory storage for shortened URLs
const urlStore = new Map();

function generateShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// POST /api/shorten - Create a shortened URL
app.post('/api/shorten', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL. Must be a valid HTTP or HTTPS URL.' });
  }

  let shortCode = generateShortCode();
  while (urlStore.has(shortCode)) {
    shortCode = generateShortCode();
  }

  urlStore.set(shortCode, {
    originalUrl: url,
    createdAt: new Date().toISOString(),
    clicks: 0
  });

  const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
  res.status(201).json({ shortCode, shortUrl, originalUrl: url });
});

// GET /:code - Redirect to original URL
app.get('/:code([a-zA-Z0-9]{6})', (req, res) => {
  const { code } = req.params;
  const entry = urlStore.get(code);

  if (!entry) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  entry.clicks++;
  res.redirect(301, entry.originalUrl);
});

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
