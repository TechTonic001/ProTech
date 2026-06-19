// config/db.js
// PostgreSQL connection — Neon.tech cloud database

const { Pool } = require('pg')

let pool

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1,              // CRITICAL for serverless — one connection per function instance
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true
    })

    pool.on('error', (err) => {
      console.error('[POOL ERROR]', err.message)
    })
  }
  return pool
}

// This wrapper makes queries work the same way
// as pg pool code so nothing else needs to change much
const query = async (text, params) => {
  const currentPool = getPool()
  try {
    const result = await currentPool.query(text, params)
    return result
  } catch (err) {
    console.error('[DB ERROR]', err.message)
    console.error('[DB QUERY]', text.substring(0, 100))
    throw err
  }
}

module.exports = { query, pool: getPool }
