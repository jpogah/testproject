const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = 'urls.db';

app.use(express.json());

let db = null;

// Initialize SQLite database for URL shortening
async function initDb() {
  const SQL = await initSqlJs();

  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_original_url ON urls(original_url)');
  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Generate a unique short code (6-8 chars)
function generateShortCode() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 7);
}

// Validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// POST /api/shorten - Shorten a URL
app.post('/api/shorten', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not initialized' });
  }

  const { original_url } = req.body;

  if (!original_url) {
    return res.status(400).json({ error: 'original_url is required' });
  }

  if (!isValidUrl(original_url)) {
    return res.status(400).json({ error: 'Invalid URL format. Must be a valid HTTP or HTTPS URL.' });
  }

  // Check for existing URL (handle duplicates gracefully)
  const existing = db.exec('SELECT short_code FROM urls WHERE original_url = ?', [original_url]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    const shortCode = existing[0].values[0][0];
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    return res.json({
      short_url: `${baseUrl}/${shortCode}`,
      short_code: shortCode,
      original_url: original_url,
      existing: true
    });
  }

  // Generate unique short code with retry for collisions
  let shortCode;
  let attempts = 0;

  while (attempts < 10) {
    shortCode = generateShortCode();
    try {
      db.run('INSERT INTO urls (short_code, original_url) VALUES (?, ?)', [shortCode, original_url]);
      saveDb();
      break;
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  if (attempts >= 10) {
    return res.status(500).json({ error: 'Failed to generate unique short code' });
  }

  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  res.status(201).json({
    short_url: `${baseUrl}/${shortCode}`,
    short_code: shortCode,
    original_url: original_url
  });
});

// GET /:code - Redirect to original URL
app.get('/:code', (req, res, next) => {
  if (!db) {
    return next();
  }

  const { code } = req.params;

  // Skip if it looks like a known route
  if (code === 'tasks' || code === 'api') {
    return next();
  }

  const result = db.exec('SELECT original_url FROM urls WHERE short_code = ?', [code]);
  if (result.length > 0 && result[0].values.length > 0) {
    return res.redirect(301, result[0].values[0][0]);
  }
  next();
});

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

// Initialize database and start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Task API server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
