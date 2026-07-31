require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const db = require('../config/db');
(async () => {
  try {
    const r = await db.query(`SELECT conname, pg_get_constraintdef(c.oid) as def
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'payments';`);
    console.log(r.rows);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
