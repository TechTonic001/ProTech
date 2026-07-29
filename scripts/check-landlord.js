const fs = require('fs');
try {
  const envText = fs.readFileSync('./Backend/.env', 'utf8');
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.substring(0, idx);
    let val = trimmed.substring(idx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
} catch (err) {}

const db = require('../Backend/config/db');
(async () => {
  try {
    const r = await db.query('SELECT user_id, email, subaccount_code FROM users WHERE user_id = $1', [1]);
    console.log(r.rows[0] || 'No user found');
  } catch (err) {
    console.error('DB error:', err.message || err);
  }
})();
