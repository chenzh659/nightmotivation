const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { quotes, backgrounds } = require("./seed");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const dbPath = path.join(dataDir, "night-focus.db");

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function openDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eyebrow TEXT NOT NULL,
      headline TEXT NOT NULL,
      message TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backgrounds (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      file TEXT NOT NULL,
      swatch_a TEXT NOT NULL,
      swatch_b TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      quote_id INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL,
      shown_on TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seed(db);
  return db;
}

function seed(db) {
  const quoteCount = db.prepare("SELECT COUNT(*) AS count FROM quotes").get().count;
  if (quoteCount === 0) {
    const insertQuote = db.prepare("INSERT INTO quotes (eyebrow, headline, message) VALUES (?, ?, ?)");
    db.exec("BEGIN");
    try {
      quotes.forEach((row) => insertQuote.run(...row));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const insertBackground = db.prepare(`
    INSERT INTO backgrounds (id, label, file, swatch_a, swatch_b)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      file = excluded.file,
      swatch_a = excluded.swatch_a,
      swatch_b = excluded.swatch_b
  `);
  db.exec("BEGIN");
  try {
    backgrounds.forEach((row) => insertBackground.run(...row));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('background', 'lake')").run();
}

module.exports = { openDb, hashText, todayKey, rootDir };
