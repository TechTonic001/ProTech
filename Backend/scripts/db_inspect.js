require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const db = require('../config/db');
(async () => {
  try {
    const r = await db.query("select column_name from information_schema.columns where table_name='leases' order by ordinal_position");
    console.log(r.rows);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
