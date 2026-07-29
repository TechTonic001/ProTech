const token = process.argv[2] || process.env.API_TOKEN;
const leaseId = process.argv[3] || process.env.LEASE_ID || '1';
if (!token) {
  console.error('Usage: node scripts/checkout-call.js <TOKEN> [leaseId]');
  process.exit(1);
}

const DEFAULT_LOCAL_API = 'http://localhost:5001/api';
const DEFAULT_DEPLOY_API = 'https://protechbackend.vercel.app/api';
const API_BASE = process.env.API_BASE || process.env.BACKEND_URL || DEFAULT_LOCAL_API;
console.log('[CHECKOUT] Using API base:', API_BASE);
console.log('[CHECKOUT] Local API default:', DEFAULT_LOCAL_API);
console.log('[CHECKOUT] Deployed API default:', DEFAULT_DEPLOY_API);
(async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${API_BASE}/payments/checkout/${leaseId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    console.log('status', res.status);
    const text = await res.text();
    console.log('body', text);
  } catch (err) {
    console.error('error', err.message || err);
  }
})();
