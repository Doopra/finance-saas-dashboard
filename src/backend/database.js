'use strict';

const { Pool } = require('pg');

/**
 * =========================
 * CONFIG
 * =========================
 */
function getPgConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }

  return {
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  };
}

/**
 * =========================
 * POOL SINGLETON
 * =========================
 */
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(getPgConfig());

    pool.on('connect', () => {
      console.log('[DB] Connected');
    });

    pool.on('error', (err) => {
      console.error('[DB ERROR]', err);
    });
  }

  return pool;
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
 * PLACEHOLDER CONVERTER
 * =========================
 */
function convertPlaceholders(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

/**
 * =========================
 * INIT DATABASE (SAFE)
 * =========================
 */
async function initDB() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = getPool();

    console.log('[DB] Initializing schema...');

    // Test connection
    await db.query('SELECT 1');

    /**
     * USERS
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        currency TEXT DEFAULT 'NGN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settings TEXT DEFAULT '{}'
      )
    `);

    /**
     * STATEMENTS
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS statements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        status TEXT DEFAULT 'processing',
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    /**
     * TRANSACTIONS
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        statement_id INTEGER REFERENCES statements(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        original_category TEXT,
        bank_name TEXT DEFAULT 'Unknown Bank',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    /**
     * CATEGORY RULES
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS category_rules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        pattern TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    /**
     * AI CACHE
     */
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_insight_cache (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        insight_type TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] Schema ready');
  })();

  return initPromise;
}

/**
 * =========================
 * QUERY HELPERS (AUTO INIT FIX)
 * =========================
 */
async function query(sql, params = []) {
  await initDB(); // 🔥 CRITICAL FIX

  const res = await getPool().query(
    convertPlaceholders(sql),
    params
  );

  return res.rows;
}

async function get(sql, params = []) {
  await initDB(); // 🔥 CRITICAL FIX

  const res = await getPool().query(
    convertPlaceholders(sql),
    params
  );

  return res.rows[0] || null;
}

async function run(sql, params = []) {
  await initDB(); // 🔥 CRITICAL FIX

  let pgSql = convertPlaceholders(sql);

  const isInsert = /^\s*INSERT/i.test(pgSql);

  if (isInsert && !pgSql.includes('RETURNING')) {
    pgSql += ' RETURNING id';
  }

  const res = await getPool().query(pgSql, params);

  return {
    id: res.rows?.[0]?.id || null,
    changes: res.rowCount,
  };
}

module.exports = {
  initDB,
  query,
  get,
  run,
  getPool,
};