import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'cloaktalk.db');

let db;

export function getDb() {
  if (!db) {
    const dataDir = dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar TEXT,
      public_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      encrypted_content TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
  `);
}

export function findUserByGoogleId(googleId) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
}

export function findUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser({ id, googleId, name, email, avatar }) {
  const db = getDb();
  db.prepare(
    'INSERT INTO users (id, google_id, name, email, avatar) VALUES (?, ?, ?, ?, ?)'
  ).run(id, googleId, name, email, avatar);
  return findUserById(id);
}

export function updatePublicKey(userId, publicKey) {
  const db = getDb();
  db.prepare('UPDATE users SET public_key = ? WHERE id = ?').run(publicKey, userId);
}

export function getAllUsers(excludeUserId) {
  const db = getDb();
  return db
    .prepare('SELECT id, name, email, avatar, public_key, last_seen FROM users WHERE id != ?')
    .all(excludeUserId);
}

export function saveMessage({ id, senderId, receiverId, encryptedContent, iv }) {
  const db = getDb();
  db.prepare(
    'INSERT INTO messages (id, sender_id, receiver_id, encrypted_content, iv) VALUES (?, ?, ?, ?, ?)'
  ).run(id, senderId, receiverId, encryptedContent, iv);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}

export function getConversation(userId1, userId2, limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(userId1, userId2, userId2, userId1, limit)
    .reverse();
}

export function updateLastSeen(userId) {
  const db = getDb();
  db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
}

export function searchUsers(query, excludeUserId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, name, email, avatar FROM users 
       WHERE id != ? AND (name LIKE ? OR email LIKE ?) 
       LIMIT 20`
    )
    .all(excludeUserId, `%${query}%`, `%${query}%`);
}
