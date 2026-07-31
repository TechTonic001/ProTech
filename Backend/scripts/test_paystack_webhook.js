// scripts/test_paystack_webhook.js
// Usage: node scripts/test_paystack_webhook.js [--url=http://localhost:5001/api/payments/webhook] [--secret=sk_test_xxx]

const http = require('http');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });
dotenv.config({ path: require('path').join(__dirname, '..', '.env.local') });

const argv = process.argv.slice(2);
const argMap = argv.reduce((acc, cur) => {
  const m = cur.match(/^--([^=]+)=?(.*)$/);
  if (m) acc[m[1]] = m[2] || true;
  return acc;
}, {});

const WEBHOOK_URL = argMap.url || process.env.WEBHOOK_TEST_URL || 'http://localhost:5001/api/payments/webhook';
const PAYSTACK_SECRET = argMap.secret || process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_PUBLIC_KEY || '';

const DB_LOOKUP = !!argMap.auto_detect;

const run = async () => {
  if (!PAYSTACK_SECRET) {
    console.error('Missing Paystack secret. Provide via --secret or set PAYSTACK_SECRET_KEY in .env');
    process.exit(1);
  }

  // Determine lease/tenant/landlord/property IDs
  let lease_id = argMap.lease_id ? Number(argMap.lease_id) : null;
  let tenant_id = argMap.tenant_id ? Number(argMap.tenant_id) : null;
  let landlord_id = argMap.landlord_id ? Number(argMap.landlord_id) : null;
  let property_id = argMap.property_id ? Number(argMap.property_id) : null;

  if ((!lease_id || !tenant_id) && DB_LOOKUP) {
    try {
      const db = require('../config/db');
      const rows = await db.query('select lease_id, tenant_id, landlord_id, property_id, rent_amount from leases order by lease_id limit 1');
      if (rows && rows.rows && rows.rows.length) {
        const r = rows.rows[0];
        lease_id = lease_id || r.lease_id;
        tenant_id = tenant_id || r.tenant_id;
        landlord_id = landlord_id || r.landlord_id;
        property_id = property_id || r.property_id;
      }
    } catch (e) {
      console.warn('DB lookup failed:', e.message);
    }
  }

  // Fallback defaults (low-risk test values)
  lease_id = lease_id || 1;
  tenant_id = tenant_id || 1;
  landlord_id = landlord_id || 1;
  property_id = property_id || 1;

  const reference = `TEST-${Date.now()}`;
  const amountNaira = argMap.amount ? Number(argMap.amount) : 1000; // ₦1,000
  const amountKobo = amountNaira * 100;

  const event = {
    event: 'charge.success',
    data: {
      reference,
      amount: amountKobo,
      subaccount: null,
      metadata: {
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        rent_amount: amountNaira,
        service_fee: argMap.service_fee ? Number(argMap.service_fee) : 500,
        receipt_number: `R-${Date.now()}`,
        subaccount_code: argMap.subaccount_code || 'TEST_SUB_001',
        room_number: argMap.room_number || 'A1',
        property_name: argMap.property_name || 'Test Property',
        hostel_name: argMap.property_name || 'Test Property',
        tenant_name: argMap.tenant_name || 'Test Tenant'
      }
    }
  };

  const rawBody = Buffer.from(JSON.stringify(event), 'utf8');
  const signature = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');

  const urlObj = new URL(WEBHOOK_URL);
  const client = urlObj.protocol === 'https:' ? https : http;

  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: `${urlObj.pathname}${urlObj.search || ''}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': rawBody.length,
      'X-Paystack-Signature': signature,
    },
  };

  console.log('Sending test webhook to', WEBHOOK_URL);
  console.log('Reference:', reference);
  console.log('Using metadata:', { lease_id, tenant_id, landlord_id, property_id });

  const req = client.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      try {
        console.log('Response body:', JSON.parse(data));
      } catch (e) {
        console.log('Response body (raw):', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err.message);
  });

  req.write(rawBody);
  req.end();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
