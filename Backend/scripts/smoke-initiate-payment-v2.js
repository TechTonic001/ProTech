const http = require('http');

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

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'GET',
      headers: {},
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

const db = require('../config/db');

function put(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'PUT',
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
    // 1. Login as landlord
    const loginLandlord = await post('/api/auth/login', { identifier: 'smokelandlord', password: 'Password123!', expectedRole: 'landlord' });
    const parsedLandlord = JSON.parse(loginLandlord.body || '{}');
    const landlordToken = parsedLandlord?.data?.accessToken;
    const landlord_code = parsedLandlord?.data?.user?.landlord_code;
    console.log('Landlord login', loginLandlord.status, landlord_code ? 'has code' : 'no code');
    if (!landlordToken) return console.error('Landlord login failed');

    // 2. Register tenant
    const tenantUsername = `smoke_tenant_http_${Date.now()}`;
    const tenantEmail = `${tenantUsername}@example.com`;
    const tenantPassword = 'Password123!';
    const reg = await post('/api/auth/register', {
      username: tenantUsername,
      full_name: 'Smoke Tenant',
      email: tenantEmail,
      phone_number: '08000000001',
      password: tenantPassword,
      role: 'tenant',
      landlord_code: landlord_code
    });
    console.log('REGISTER', reg.status, reg.body);
    const regBody = JSON.parse(reg.body || '{}');
    const tenantId = regBody?.data?.user_id || regBody?.data?.user?.user_id;

    // 3. Approve tenant as landlord
    const pending = await get('/api/approval/pending', landlordToken);
    const pendingBody = JSON.parse(pending.body || '[]');
    const approvals = pendingBody?.data || pendingBody;
    const myApproval = (approvals || []).find(a => a.username === tenantUsername || a.email === tenantEmail || a.tenant_id == tenantId);
    if (!myApproval) {
      console.error('Could not find pending approval for tenant', tenantUsername);
    } else {
      const approvalId = myApproval.approval_id;
      const process = await put(`/api/approval/${approvalId}`, { status: 'approved' }, landlordToken);
      console.log('APPROVE', process.status, process.body);
    }

    // 4. Login as tenant (should now succeed)
    const loginTenant = await post('/api/auth/login', { identifier: tenantUsername, password: tenantPassword, expectedRole: 'tenant' });
    const parsedTenant = JSON.parse(loginTenant.body || '{}');
    const tenantToken = parsedTenant?.data?.accessToken;
    console.log('Tenant login', loginTenant.status);
    if (!tenantToken) return console.error('Tenant login failed');

    // 5. Landlord creates lease for first available room (fetch rooms)
    const roomsRes = await get('/api/rooms/all-with-leases', landlordToken);
    const roomsBody = JSON.parse(roomsRes.body || '{}');
    const rooms = roomsBody?.data || roomsBody;
    let freeRoom = (rooms || []).find(r => !r.is_occupied && r.property_id && r.property_id > 0);
    if (!freeRoom) {
      console.log('No free room found — creating a new property with rooms');
      const created = await post('/api/property', {
        property_name: 'Smoke Property for Payments',
        address: '1 Smoke Lane',
        city: 'Test City',
        total_rooms: 2,
        default_yearly_rent: 1200000
      }, landlordToken);
      console.log('CREATE PROPERTY', created.status, created.body);

      const roomsRes2 = await get('/api/rooms/all-with-leases', landlordToken);
      const roomsBody2 = JSON.parse(roomsRes2.body || '{}');
      const rooms2 = roomsBody2?.data || roomsBody2;
      freeRoom = (rooms2 || []).find(r => !r.is_occupied && r.property_id && r.property_id > 0);
      if (!freeRoom) return console.error('Still no free room found after creating property');
    }

    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const start_date = start.toISOString().slice(0,10);
    const end_date = end.toISOString().slice(0,10);

    const createLease = await post('/api/lease', {
      tenant_id: tenantId,
      room_id: freeRoom.room_id,
      start_date,
      end_date,
      rent_amount: freeRoom.monthly_rent || 100000,
      payment_frequency: 'monthly'
    }, landlordToken);
    console.log('CREATE LEASE', createLease.status, createLease.body);
    const leaseObj = JSON.parse(createLease.body || '{}');
    const leaseId = leaseObj?.data?.lease?.lease_id;
    if (!leaseId) return console.error('Lease creation failed');

    // 6. Tenant initiates payment (expected to be blocked because landlord has no bank setup)
    const attempt = await post('/api/payments/initiate', { lease_id: leaseId }, tenantToken);
    console.log('INITIATE', attempt.status, attempt.body);

    // 7. If blocked, patch landlord in DB to add subaccount and retry
    if (attempt.status === 400) {
      console.log('Calling landlord subaccount API to connect bank (may use Paystack)');
      try {
        const sub = await post('/api/payments/subaccount', {
          business_name: 'Smoke Hostel',
          settlement_bank: '044',
          account_number: '0000000000',
          bank_name: 'Test Bank',
          percentage_charge: 2
        }, landlordToken);
        console.log('SUBACCOUNT CREATE', sub.status, sub.body);

        const retry = await post('/api/payments/initiate', { lease_id: leaseId }, tenantToken);
        console.log('INITIATE RETRY', retry.status, retry.body.slice(0,1000));
      } catch (subErr) {
        console.error('Subaccount creation failed', subErr);
      }
    }

  } catch (err) {
    console.error('ERR', err);
  } finally {
    setTimeout(()=>process.exit(0), 200);
  }
})();
