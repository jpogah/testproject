const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TEST_DB_PATH = path.join(__dirname, 'test_links.db');

// Clean up test database before and after
function cleanup() {
    const files = [TEST_DB_PATH, `${TEST_DB_PATH}-wal`, `${TEST_DB_PATH}-shm`];
    for (const file of files) {
        try { fs.unlinkSync(file); } catch (e) { /* ignore */ }
    }
}

function runTests() {
    cleanup();

    try {
        // Test 1: Schema creates table successfully
        console.log('Test 1: Schema creates table...');
        const db = new Database(TEST_DB_PATH);
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('  PASS: Table created');

        // Test 2: Can insert a link
        console.log('Test 2: Insert link...');
        const insert = db.prepare(`
            INSERT INTO links (short_code, original_url)
            VALUES (?, ?)
        `);
        insert.run('abc123', 'https://example.com');
        console.log('  PASS: Link inserted');

        // Test 3: Can query by short_code
        console.log('Test 3: Query by short_code...');
        const select = db.prepare('SELECT * FROM links WHERE short_code = ?');
        const link = select.get('abc123');
        assert.strictEqual(link.short_code, 'abc123');
        assert.strictEqual(link.original_url, 'https://example.com');
        assert.strictEqual(link.click_count, 0);
        assert.ok(link.created_at);
        assert.strictEqual(link.expires_at, null);
        console.log('  PASS: Query returned correct data');

        // Test 4: short_code is unique
        console.log('Test 4: Unique constraint...');
        try {
            insert.run('abc123', 'https://other.com');
            console.log('  FAIL: Should have thrown unique constraint error');
            process.exit(1);
        } catch (e) {
            assert.ok(e.message.includes('UNIQUE'));
            console.log('  PASS: Unique constraint enforced');
        }

        // Test 5: Click count can be incremented
        console.log('Test 5: Update click_count...');
        const update = db.prepare('UPDATE links SET click_count = click_count + 1 WHERE short_code = ?');
        update.run('abc123');
        const updated = select.get('abc123');
        assert.strictEqual(updated.click_count, 1);
        console.log('  PASS: Click count incremented');

        db.close();
        console.log('\nAll tests passed!');
    } finally {
        cleanup();
    }
}

runTests();
