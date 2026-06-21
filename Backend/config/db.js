const { Pool } = require('pg')

let pool

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000
    })

    pool.on('error', (err) => {
      console.error('[POOL ERROR]', err.message)
      pool = null  // force recreation on next request if pool dies
    })
  }
  return pool
}

// Custom wrapper to support both result.rows (original code) and [rows, result] destructuring (mysql-style)
const query = async (text, params) => {
  const currentPool = getPool()
  try {
    const result = await currentPool.query(text, params)
    
    // Define custom iterator on the result object
    result[Symbol.iterator] = function* () {
      yield result.rows;
      yield result;
    };
    
    return result
  } catch (err) {
    console.error('[DB ERROR]', err.message)
    console.error('[DB QUERY]', text.substring(0, 100))
    throw err
  }
}

module.exports = { query, pool: getPool }
