require('dotenv').config();
const { query } = require('../config/db');

(async () => {
  try {
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS landlord_code VARCHAR(20)");
    await query("CREATE UNIQUE INDEX IF NOT EXISTS users_landlord_code_unique ON users (landlord_code) WHERE landlord_code IS NOT NULL");
    await query("UPDATE users SET landlord_code = 'PT-' || CAST(user_id AS TEXT) WHERE role = 'landlord' AND (landlord_code IS NULL OR landlord_code = '')");
    const result = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'landlord_code'");
    console.log(JSON.stringify(result.rows));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
