require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const db = require('../config/db');
(async () => {
  try {
    const r = await db.query("select payment_id, lease_id, tenant_id, landlord_id, paystack_ref, payment_status, amount_paid, created_at from payments where paystack_ref like 'TEST-%' order by created_at desc limit 10");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
