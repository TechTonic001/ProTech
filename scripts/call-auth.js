const token = process.argv[2];
const endpoint = process.argv[3] || 'metadata';
if (!token) {
  console.error('Usage: node scripts/call-auth.js <TOKEN> [metadata|checkout <leaseId>|initiate <leaseId> [amount]]');
  process.exit(1);
}

const DEFAULT_LOCAL_API = 'http://localhost:5001/api/payments';
const DEFAULT_DEPLOY_API = 'https://protechbackend.vercel.app/api/payments';
const API = process.env.API_BASE || process.env.BACKEND_URL || DEFAULT_LOCAL_API;
console.log('[API] Using backend:', API);
console.log('[API] Local default:', DEFAULT_LOCAL_API);
console.log('[API] Deployed default:', DEFAULT_DEPLOY_API);

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

(async () => {
  try {
    if (endpoint === 'metadata') {
      const res = await fetch(`${API}/metadata`, { headers });
      console.log(await res.text());
      return;
    }

    if (endpoint === 'checkout') {
      const leaseId = process.argv[4];
      if (!leaseId) return console.error('Provide leaseId as 3rd arg');
      const res = await fetch(`${API}/checkout/${leaseId}`, { headers });
      console.log(await res.text());
      return;
    }

    if (endpoint === 'initiate') {
      const leaseId = process.argv[4];
      const amount = process.argv[5];
      if (!leaseId) return console.error('Provide leaseId as 3rd arg');
      const payload = { lease_id: Number(leaseId) };
      if (amount) payload.amount = Number(amount);
      const res = await fetch(`${API}/initiate`, { method: 'POST', headers, body: JSON.stringify(payload) });
      console.log(await res.text());
      return;
    }

    console.error('Unknown endpoint');
  } catch (err) {
    console.error('Request failed:', err.message || err);
  }
})();
