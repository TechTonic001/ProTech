const { Pool } = require('pg')

let pool

const getDatabaseConnectionString = () => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.PG_URL ||
    process.env.DB_URL ||
    ''
  )
}

const getPool = () => {
  if (!pool) {
    const connectionString = getDatabaseConnectionString()

    if (!connectionString) {
      throw new Error('[DB CONFIG] No database connection string was found. Set DATABASE_URL (or a supported alias) in the environment.')
    }

    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)

    if (!connectionString.includes('-pooler')) {
      console.warn(
        '[DB CONFIG] WARNING: The configured connection string does not look like a Neon pooled URL. ' +
          'If this runs on Vercel, use the pooled connection string.'
      )
    }

    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 1,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
      allowExitOnIdle: true,
    })

    pool.on('error', (err) => {
      console.error('[DB POOL ERROR]', err.message)
      pool = null
    })

    pool.on('connect', () => {
      console.log('[DB] New connection established')
    })
  }
  return pool
}

const query = async (text, params, retries = 1) => {
  try {
    const result = await getPool().query(text, params)

    // Support mysql-style destructuring used in seedAdmin: const [rows] = await query(...)
    result[Symbol.iterator] = function* () {
      yield result.rows
      yield result
    }

    return result
  } catch (err) {
    const retryable = err.code === 'ECONNRESET' ||
      err.code === 'ECONNREFUSED' ||
      err.message.toLowerCase().includes('timeout')

    if (retries > 0 && retryable) {
      console.warn('[DB] Retrying after connection error...', err.message)
      pool = null
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return query(text, params, retries - 1)
    }

    console.error('[DB ERROR]', err.message)
    console.error('[DB QUERY]', text.substring(0, 100))
    throw err
  }
}

const testConnection = async () => {
  try {
    const connectionString = getDatabaseConnectionString()
    if (!connectionString) {
      console.error('PostgreSQL connection FAILED: No database connection string was found')
      return false
    }

    const currentPool = getPool()
    await currentPool.query('SELECT 1')

    const dbName = (() => {
      try {
        return new URL(connectionString.replace(/^postgresql:/, 'http:')).pathname.replace(/^\//, '') || 'protech_db'
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
