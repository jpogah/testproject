-- SQLite schema for link shortener
-- Table: links

CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    click_count INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT
);

-- Index on short_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);

-- Index on expires_at for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
