/*
 * Turso Database Module
 * Replaces PostgreSQL pg.Pool with @libsql/client for Turso.
 * Provides same helper functions: initDB, query, get, run.
 */

'use strict';

const { createClient } = require('@libsql/client');

/**
 * =========================
 * CONFIG
 * =========================
 */
function getTursoConfig() {
  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is missing');
  }
  const isLocal = process.env.TURSO_DATABASE_URL.startsWith('file:');
  if (!isLocal && !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_AUTH_TOKEN is missing');
  }
  return {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
}

/**
 * =========================
 * CLIENT SINGLETON
 * =========================
 */
let client;
function getClient() {
  if (!client) {
    const cfg = getTursoConfig();
    client = createClient({ url: cfg.url, authToken: cfg.authToken });
    console.log('[DB] Turso client created');
  }
  return client;
}

/**
 * =========================
 * BIGINT SANITIZER
 * Turso / libSQL returns INTEGER columns as BigInt.
 * JSON.stringify cannot serialize BigInt, so we convert
 * every BigInt value to a plain Number throughout all rows.
 * =========================
 */
function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const clean = {};
  for (const [key, value] of Object.entries(row)) {
    clean[key] = typeof value === 'bigint' ? Number(value) : value;
  }
  return clean;
}

function sanitizeRows(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(sanitizeRow);
}

/**
 * =========================
 * INIT GUARD (IMPORTANT FIX)
 * Prevents race conditions in Next.js / serverless
 * =========================
 */
let initPromise = null;

/**
 * =========================
 * INIT DATABASE (SAFE)
 * =========================
 */
async function initDB() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = getClient();
    console.log('[DB] Initializing Turso schema...');
    // Test connection
    await db.execute('SELECT 1');

    // Users table
    await db.execute(`
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

    // Statements table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        status TEXT DEFAULT 'processing',
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        statement_id INTEGER REFERENCES statements(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        original_category TEXT,
        bank_name TEXT DEFAULT 'Unknown Bank',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Category rules table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS category_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        pattern TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI insight cache table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_insight_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        insight_type TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] Turso schema ready');
  })();
  return initPromise;
}

/**
 * =========================
 * QUERY HELPERS (AUTO INIT FIX)
 * =========================
 */
async function query(sql, params = []) {
  await initDB();
  const res = await getClient().execute(sql, params);
  return sanitizeRows(res.rows);
}

async function get(sql, params = []) {
  await initDB();
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  await initDB();
  const isInsert = /^\s*INSERT/i.test(sql);
  const result = await getClient().execute(sql, params);
  if (isInsert) {
    // Turso returns lastInsertRowid as BigInt — convert to Number
    const id = typeof result.lastInsertRowid === 'bigint'
      ? Number(result.lastInsertRowid)
      : (result.lastInsertRowid || null);
    return { id, changes: result.changes };
  }
  return { changes: result.changes };
}

module.exports = {
  initDB,
  query,
  get,
  run,
  getClient,
};