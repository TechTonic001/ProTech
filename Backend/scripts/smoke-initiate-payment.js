const http = require('http');
const db = require('../config/db');
const bcrypt = require('bcryptjs');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
    });
    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    // 1. Get landlord ID (smokelandlord) from DB
    const landlordRes = await db.query("SELECT user_id, username FROM users WHERE username = $1", ['smokelandlord']);
    if (landlordRes.rows.length === 0) return console.error('Landlord smokelandlord not found');
    const landlordId = landlordRes.rows[0].user_id;
    console.log('Landlord ID', landlordId);

    // 2. Create an approved tenant directly in DB
    const tenantUsername = `smoke_tenant_${Date.now()}`;
    const tenantEmail = `${tenantUsername}@example.com`;
    const tenantPassword = 'Password123!';
    const password_hash = await bcrypt.hash(tenantPassword, 12);

    const insertTenant = await db.query(
      `INSERT INTO users (username, full_name, email, phone_number, password_hash, role, is_approved)
       VALUES ($1,$2,$3,$4,$5,'tenant',1) RETURNING user_id`,
      [tenantUsername, 'Smoke Tenant', tenantEmail, '08000000000', password_hash]
    );
    const tenantId = insertTenant.rows[0].user_id;
    console.log('Inserted tenant', tenantId, tenantUsername);

    // 3. Login as landlord to get accessToken
    const loginLandlord = await post('/api/auth/login', { identifier: 'smokelandlord', password: 'Password123!', expectedRole: 'landlord' });
    const parsedLandlord = JSON.parse(loginLandlord.body || '{}');
    const landlordToken = parsedLandlord?.data?.accessToken;
    if (!landlordToken) return console.error('Could not login landlord');

    // 4. Create a lease for room_id 129 (one of the recently generated rooms)
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const start_date = start.toISOString().slice(0,10);
    const end_date = end.toISOString().slice(0,10);

    const createLease = await post('/api/lease', {
      tenant_id: tenantId,
      room_id: 129,
      start_date,
      end_date,
      rent_amount: 100000,
      payment_frequency: 'monthly'
    }, landlordToken);

    console.log('CREATE LEASE', createLease.status, createLease.body);
    const leaseBody = JSON.parse(createLease.body || '{}');
    const leaseId = leaseBody?.data?.lease?.lease_id;
    if (!leaseId) return console.error('Lease creation failed');

    // 5. Login as tenant
    const loginTenant = await post('/api/auth/login', { identifier: tenantUsername, password: tenantPassword, expectedRole: 'tenant' });
    const parsedTenant = JSON.parse(loginTenant.body || '{}');
    const tenantToken = parsedTenant?.data?.accessToken;
    if (!tenantToken) return console.error('Tenant login failed', loginTenant.body);

    // 6. Tenant attempts to initiate payment (should be blocked because landlord has no bank)
    const init1 = await post('/api/payments/initiate', { lease_id: leaseId }, tenantToken);
    console.log('INITIATE ATTEMPT 1', init1.status, init1.body);

    // 7. Patch landlord to add subaccount_code (bypass external verification)
    await db.query('UPDATE users SET subaccount_code = $1, bank_name = $2, account_number = $3, account_name = $4 WHERE user_id = $5',
      ['TEST_SUB_123', 'Test Bank', '0000000000', 'Test Account', landlordId]);
    console.log('Patched landlord with subaccount_code');

    // 8. Tenant retries initiate
    const init2 = await post('/api/payments/initiate', { lease_id: leaseId }, tenantToken);
    console.log('INITIATE ATTEMPT 2', init2.status, init2.body.slice(0,1000));

  } catch (err) {
    console.error('ERR', err);
  } finally {
    // process exit
    setTimeout(() => process.exit(0), 200);
  }
})();
