require('dotenv').config({ path: './Backend/.env' });
const { query } = require('./Backend/config/db');

(async () => {
  try {
    const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
