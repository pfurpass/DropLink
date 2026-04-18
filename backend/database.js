const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'droplink.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath);

function seedExpiryDefaults() {
  db.get("SELECT COUNT(*) as count FROM expiry_options", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO expiry_options (label, seconds) VALUES (?, ?)");
      [['1 Hour', 3600], ['1 Day', 86400], ['7 Days', 604800], ['30 Days', 2592000]]
        .forEach(([label, seconds]) => stmt.run(label, seconds));
      stmt.finalize();
    }
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      fileName TEXT,
      originalNames TEXT,
      size INTEGER,
      expiresAt DATETIME,
      maxDownloads INTEGER,
      downloads INTEGER DEFAULT 0,
      passwordHash TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.all("PRAGMA table_info(expiry_options)", (err, cols) => {
    if (err) return;

    if (!cols || cols.length === 0) {
      db.run(`
        CREATE TABLE expiry_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          seconds INTEGER NOT NULL
        )
      `, seedExpiryDefaults);
      return;
    }

    const hasMinutes = cols.some(c => c.name === 'minutes');
    const hasSeconds = cols.some(c => c.name === 'seconds');

    if (hasMinutes && !hasSeconds) {
      db.serialize(() => {
        db.run("ALTER TABLE expiry_options RENAME TO expiry_options_old");
        db.run(`
          CREATE TABLE expiry_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            seconds INTEGER NOT NULL
          )
        `);
        db.run("INSERT INTO expiry_options SELECT id, label, minutes * 60 FROM expiry_options_old");
        db.run("DROP TABLE expiry_options_old");
      });
    }
  });
});

module.exports = db;
