const db = require('../config/db');

const keepAliveNeon = async () => {
  try {
    await db.query('SELECT 1');
    console.log('[KEEP-ALIVE] Neon pinged successfully');
  } catch (err) {
    console.error('[KEEP-ALIVE] Ping failed:', err.message);
  }
};

module.exports = { keepAliveNeon };
