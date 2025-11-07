import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'

let db: Database.Database

export function getDb() {
  if (!db) throw new Error('DB is not initialized')
  return db
}

export function migrate() {
  const dbPath = join(app.getPath('userData'), 'price-monitor.db')
  db = new Database(dbPath)

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      marketplace TEXT,
      title TEXT,
      custom_name TEXT,
      pack_qty INTEGER DEFAULT 1,
      current_price REAL,
      price_per_unit REAL,
      updated_at DATETIME,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace TEXT UNIQUE,
      cookies_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}
