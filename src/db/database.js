const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Initialize database with schema if it doesn't exist
const dbExists = fs.existsSync(dbPath);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

if (!dbExists) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('Database initialized with schema');
} else {
    // Run migrations for existing databases
    const columns = db.prepare("PRAGMA table_info(websites)").all();
    const hasExpectedStatusCodes = columns.some(col => col.name === 'expected_status_codes');

    if (!hasExpectedStatusCodes) {
        db.exec("ALTER TABLE websites ADD COLUMN expected_status_codes TEXT DEFAULT '200,201,204,301,302'");
        console.log('Migration: Added expected_status_codes column');
    }
}

module.exports = db;
