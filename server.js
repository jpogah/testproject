const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for tasks
let tasks = [];
let nextId = 1;

// In-memory storage for links
let links = [];
let nextLinkId = 1;

// Generate a random short code
function generateShortCode() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

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

// ============================================
// Link Management API
// ============================================

// GET /api/links - List all links with pagination and search
app.get('/api/links', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  let filteredLinks = links;

  if (search) {
    const searchLower = search.toLowerCase();
    filteredLinks = links.filter(link =>
      link.shortCode.toLowerCase().includes(searchLower) ||
      link.originalUrl.toLowerCase().includes(searchLower)
    );
  }

  const total = filteredLinks.length;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const paginatedLinks = filteredLinks.slice(offset, offset + limitNum);

  res.json({
    links: paginatedLinks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  });
});

// POST /api/links - Create a new shortened link
app.post('/api/links', (req, res) => {
  const { originalUrl, customCode } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ error: 'originalUrl is required' });
  }

  try {
    new URL(originalUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  let shortCode = customCode || generateShortCode();

  if (links.find(l => l.shortCode === shortCode)) {
    return res.status(409).json({ error: 'Short code already exists' });
  }

  const link = {
    id: nextLinkId++,
    shortCode,
    originalUrl,
    clickCount: 0,
    createdAt: new Date().toISOString()
  };

  links.push(link);
  res.status(201).json(link);
});

// GET /api/links/:id - Get a specific link by ID
app.get('/api/links/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const link = links.find(l => l.id === id);

  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  res.json(link);
});

// DELETE /api/links/:id - Delete a link
app.delete('/api/links/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const linkIndex = links.findIndex(l => l.id === id);

  if (linkIndex === -1) {
    return res.status(404).json({ error: 'Link not found' });
  }

  links.splice(linkIndex, 1);
  res.status(204).send();
});

// GET /s/:shortCode - Redirect to original URL (and increment click count)
app.get('/s/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const link = links.find(l => l.shortCode === shortCode);

  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  link.clickCount++;
  res.redirect(link.originalUrl);
});

// ============================================
// Link Management Dashboard
// ============================================

app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Management Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    .controls { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    input, button { padding: 10px 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    input { flex: 1; min-width: 200px; }
    button { background: #007bff; color: white; border: none; cursor: pointer; }
    button:hover { background: #0056b3; }
    button.delete { background: #dc3545; }
    button.delete:hover { background: #c82333; }
    .add-form { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .add-form input { margin-right: 10px; }
    table { width: 100%; background: white; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #333; }
    tr:hover { background: #f8f9fa; }
    .short-link { color: #007bff; text-decoration: none; }
    .short-link:hover { text-decoration: underline; }
    .original-url { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pagination { display: flex; justify-content: center; gap: 10px; margin-top: 20px; }
    .pagination button { background: #6c757d; }
    .pagination button:disabled { background: #ccc; cursor: not-allowed; }
    .pagination span { padding: 10px; }
    .empty { text-align: center; padding: 40px; color: #666; }
    .message { padding: 10px 15px; border-radius: 4px; margin-bottom: 15px; }
    .message.success { background: #d4edda; color: #155724; }
    .message.error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Link Management Dashboard</h1>

    <div id="message"></div>

    <div class="add-form">
      <h3 style="margin-bottom: 15px;">Create New Short Link</h3>
      <input type="url" id="newUrl" placeholder="Enter URL to shorten" required>
      <input type="text" id="customCode" placeholder="Custom code (optional)" style="width: 150px;">
      <button onclick="createLink()">Create Link</button>
    </div>

    <div class="controls">
      <input type="text" id="search" placeholder="Search links..." oninput="debounceSearch()">
    </div>

    <table>
      <thead>
        <tr>
          <th>Short Code</th>
          <th>Original URL</th>
          <th>Clicks</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="linksTable"></tbody>
    </table>

    <div id="emptyState" class="empty" style="display: none;">No links found. Create your first short link above!</div>

    <div class="pagination">
      <button id="prevBtn" onclick="changePage(-1)">Previous</button>
      <span id="pageInfo">Page 1 of 1</span>
      <button id="nextBtn" onclick="changePage(1)">Next</button>
    </div>
  </div>

  <script>
    let currentPage = 1;
    const limit = 10;
    let searchTimeout;

    async function loadLinks() {
      const search = document.getElementById('search').value;
      const params = new URLSearchParams({ page: currentPage, limit, ...(search && { search }) });

      try {
        const response = await fetch('/api/links?' + params);
        const data = await response.json();
        renderLinks(data.links, data.pagination);
      } catch (error) {
        showMessage('Failed to load links', 'error');
      }
    }

    function renderLinks(links, pagination) {
      const tbody = document.getElementById('linksTable');
      const emptyState = document.getElementById('emptyState');

      if (links.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
        tbody.innerHTML = links.map(link => \`
          <tr>
            <td><a class="short-link" href="/s/\${link.shortCode}" target="_blank">\${link.shortCode}</a></td>
            <td class="original-url" title="\${link.originalUrl}">\${link.originalUrl}</td>
            <td>\${link.clickCount}</td>
            <td>\${new Date(link.createdAt).toLocaleDateString()}</td>
            <td><button class="delete" onclick="deleteLink(\${link.id})">Delete</button></td>
          </tr>
        \`).join('');
      }

      document.getElementById('pageInfo').textContent = \`Page \${pagination.page} of \${pagination.totalPages || 1}\`;
      document.getElementById('prevBtn').disabled = pagination.page <= 1;
      document.getElementById('nextBtn').disabled = pagination.page >= pagination.totalPages;
    }

    async function createLink() {
      const originalUrl = document.getElementById('newUrl').value;
      const customCode = document.getElementById('customCode').value;

      if (!originalUrl) {
        showMessage('Please enter a URL', 'error');
        return;
      }

      try {
        const response = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalUrl, ...(customCode && { customCode }) })
        });

        if (response.ok) {
          document.getElementById('newUrl').value = '';
          document.getElementById('customCode').value = '';
          showMessage('Link created successfully!', 'success');
          currentPage = 1;
          loadLinks();
        } else {
          const data = await response.json();
          showMessage(data.error || 'Failed to create link', 'error');
        }
      } catch (error) {
        showMessage('Failed to create link', 'error');
      }
    }

    async function deleteLink(id) {
      if (!confirm('Are you sure you want to delete this link?')) return;

      try {
        const response = await fetch('/api/links/' + id, { method: 'DELETE' });
        if (response.ok) {
          showMessage('Link deleted successfully!', 'success');
          loadLinks();
        } else {
          showMessage('Failed to delete link', 'error');
        }
      } catch (error) {
        showMessage('Failed to delete link', 'error');
      }
    }

    function changePage(delta) {
      currentPage += delta;
      loadLinks();
    }

    function debounceSearch() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadLinks();
      }, 300);
    }

    function showMessage(text, type) {
      const el = document.getElementById('message');
      el.textContent = text;
      el.className = 'message ' + type;
      setTimeout(() => el.className = '', 3000);
    }

    loadLinks();
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Task API server running on port ${PORT}`);
});
