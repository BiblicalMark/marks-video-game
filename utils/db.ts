import Database from 'better-sqlite3';
import { join } from 'path';

// allow overriding the database file path via environment (useful for tests or production)
const dbFile = process.env.DB_FILE || join(process.cwd(), 'data.db');
const db = new Database(dbFile);

// initialize tables
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);
  // add subscription flag if missing
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_subscribed INTEGER DEFAULT 0;`);
  } catch (e) {
    // ignore if column already exists
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      value INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}
init();

export function findUser(username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findUserById(id: number) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser(username: string, password: string) {
  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  const info = stmt.run(username, password);
  return { id: info.lastInsertRowid, username, password };
}

export function getScore(userId: number) {
  const row = db.prepare('SELECT SUM(value) as total FROM scores WHERE user_id = ?').get(userId);
  return row?.total || 0;
}

export function setSubscribed(userId: number, subscribed: boolean) {
  db.prepare('UPDATE users SET is_subscribed = ? WHERE id = ?').run(subscribed ? 1 : 0, userId);
}

export function isSubscribed(userId: number): boolean {
  const row = db.prepare('SELECT is_subscribed FROM users WHERE id = ?').get(userId);
  return !!row?.is_subscribed;
}

export function addScore(userId: number, amount: number = 1) {
  const stmt = db.prepare('INSERT INTO scores (user_id, value) VALUES (?, ?)');
  stmt.run(userId, amount);
  return getScore(userId);
}

// ensure default user exists
export function ensureDefaultUser() {
  const user = findUser('alice');
  if (!user) {
    return createUser('alice', 'password123');
  }
  return user;
}

// clear all data (used by tests to reset in-memory or temp databases)
export function clear() {
  db.exec('DELETE FROM scores');
  db.exec('DELETE FROM users');
  // re-run initialization to recreate default columns if necessary
  init();
}
