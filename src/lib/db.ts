import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'links.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_short_code ON links(short_code)
`);

export default db;
