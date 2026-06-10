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
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// Immediately test the connection and log success/failure
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log(`🟩 SUCCESS: Connected to MySQL (${process.env.DB_NAME || 'protech_db'}) on XAMPP successfully!`);
  } catch (error) {
    console.log('🟥 ERROR: Database connection failed!', error.message);
    // Do not exit here if you prefer to let the server start; exit to fail fast
    process.exit(1);
  }
})();

module.exports = pool;
