// config/db.js
const mysql = require('mysql2/promise');

// Support both DB_PASSWORD and DB_PASS env names
const DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: DB_PASSWORD,
  database: process.env.DB_NAME || 'protech_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  // Cloud MySQL providers require SSL – accept their CA automatically
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
    ? { rejectUnauthorized: true }
    : undefined,
});

// Test connection but do NOT crash the process on Vercel (serverless cold-start)
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log(`🟩 SUCCESS: Connected to MySQL (${process.env.DB_NAME || 'protech_db'}) successfully!`);
  } catch (error) {
    console.log('🟥 ERROR: Database connection failed!', error.message);
    // Only hard-exit locally; on Vercel let the function return a proper error
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
  }
})();

module.exports = pool;
