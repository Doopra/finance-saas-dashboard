const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data folder exists
const dataDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finance.db');
const db = new sqlite3.Database(dbPath);

// Promised-based database helpers
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Initialize Tables
const initDB = async () => {
  // Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      currency TEXT DEFAULT 'NGN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      settings TEXT DEFAULT '{}'
    )
  `);

  // Statements Table
  await run(`
    CREATE TABLE IF NOT EXISTS statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      status TEXT DEFAULT 'processing',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Transactions Table
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id INTEGER,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'debit' or 'credit'
      category TEXT NOT NULL, -- 'Product Purchases', 'Sales Income', 'Miscellaneous Expenses'
      original_category TEXT,
      bank_name TEXT DEFAULT 'Unknown Bank',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (statement_id) REFERENCES statements(id) ON DELETE SET NULL
    )
  `);

  // Category Rules Table (for auto-learning descriptions)
  await run(`
    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pattern TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, pattern)
    )
  `);

  // AI Insight Cache Table
  await run(`
    CREATE TABLE IF NOT EXISTS ai_insight_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      insight_type TEXT NOT NULL, -- 'summary', 'forecast', 'anomalies'
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Seed default category rules if empty
  const rules = await query('SELECT count(*) as count FROM category_rules');
  if (rules[0].count === 0) {
    const defaultRules = [
      // Product Purchases keywords
      { user_id: 1, pattern: 'product', category: 'Product Purchases' },
      { user_id: 1, pattern: 'supplier', category: 'Product Purchases' },
      { user_id: 1, pattern: 'wholesale', category: 'Product Purchases' },
      { user_id: 1, pattern: 'stock', category: 'Product Purchases' },
      { user_id: 1, pattern: 'inventory', category: 'Product Purchases' },
      { user_id: 1, pattern: 'purchase', category: 'Product Purchases' },
      { user_id: 1, pattern: 'ltd', category: 'Product Purchases' },
      { user_id: 1, pattern: 'manufacturer', category: 'Product Purchases' },
      
      // Sales Income keywords
      { user_id: 1, pattern: 'sales', category: 'Sales Income' },
      { user_id: 1, pattern: 'invoice', category: 'Sales Income' },
      { user_id: 1, pattern: 'payment from', category: 'Sales Income' },
      { user_id: 1, pattern: 'credit alert', category: 'Sales Income' },
      { user_id: 1, pattern: 'deposit', category: 'Sales Income' },
      { user_id: 1, pattern: 'revenue', category: 'Sales Income' },
      { user_id: 1, pattern: 'pos deposit', category: 'Sales Income' },
      
      // Miscellaneous Expenses keywords
      { user_id: 1, pattern: 'transfer', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'pos terminal', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'airtime', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'charges', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'commission', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'fee', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'cash withdrawal', category: 'Miscellaneous Expenses' },
      { user_id: 1, pattern: 'personal', category: 'Miscellaneous Expenses' }
    ];

    for (const rule of defaultRules) {
      await run(
        'INSERT OR IGNORE INTO category_rules (user_id, pattern, category) VALUES (?, ?, ?)',
        [rule.user_id, rule.pattern, rule.category]
      );
    }
  }

  console.log('Database initialized successfully.');
};

module.exports = {
  db,
  query,
  get,
  run,
  initDB
};
