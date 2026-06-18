// config/db.js
// PostgreSQL connection — Neon.tech cloud database

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

// Test connection when server starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection FAILED:', err.message)
    return
  }
  release()
  console.log('✅ PostgreSQL connected — Neon.tech protech_db')
})

module.exports = pool
