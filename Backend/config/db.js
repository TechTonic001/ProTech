const { Pool } = require('pg')

let pool

const getPool = () => {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error('[DB CONFIG] DATABASE_URL is not set')
    } else if (!process.env.DATABASE_URL.includes('-pooler')) {
      console.warn(
        '[DB CONFIG] WARNING: DATABASE_URL hostname does not contain "-pooler". ' +
          'Use Neon pooled connection string for Vercel serverless.'
      )
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
    })

    pool.on('error', (err) => {
      console.error('[POOL ERROR]', err.message)
      pool = null
    })
  }
  return pool
}

const query = async (text, params) => {
  const currentPool = getPool()
  try {
    const result = await currentPool.query(text, params)

    // Support mysql-style destructuring used in seedAdmin: const [rows] = await query(...)
    result[Symbol.iterator] = function* () {
      yield result.rows
      yield result
    }

    return result
  } catch (err) {
    console.error('[DB ERROR]', err.message)
    console.error('[DB QUERY]', text.substring(0, 100))
    throw err
  }
}

const testConnection = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('PostgreSQL connection FAILED: DATABASE_URL is missing')
      return false
    }

    const currentPool = getPool()
    await currentPool.query('SELECT 1')

    const dbName = (() => {
      try {
        return new URL(process.env.DATABASE_URL.replace(/^postgresql:/, 'http:')).pathname.replace(/^\//, '') || 'protech_db'
      } catch {
        return 'protech_db'
      }
    })()

    console.log(`✅ PostgreSQL connected — Neon.tech ${dbName}`)
    return true
  } catch (err) {
    console.error('PostgreSQL connection FAILED:', err.message)
    return false
  }
}

module.exports = { query, pool: getPool, testConnection }
