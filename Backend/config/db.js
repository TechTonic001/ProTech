// config/db.js
// PostgreSQL connection — Neon.tech cloud database

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

// Test connection when server starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection FAILED:', err.message);
    return;
  }
  release();
  console.log('✅ PostgreSQL connected — Neon.tech protech_db');
});

// This wrapper makes queries work the same way
// as the old MySQL code so nothing else needs to change much
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return [result.rows, result];
  } catch (err) {
    console.error('[ERROR] [DB ERROR]', err.message);
    console.error('[ERROR] [DB QUERY]', text);
    throw err;
  }
};

module.exports = { query, pool };
