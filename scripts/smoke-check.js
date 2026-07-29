#!/usr/bin/env node
const DEFAULT_LOCAL_API = 'http://localhost:5001/api';
const DEFAULT_DEPLOY_API = 'https://protechbackend.vercel.app/api';
const API_BASE = process.env.API_BASE || process.env.BACKEND_URL || DEFAULT_LOCAL_API;
const token = process.argv[2] || process.env.API_TOKEN;
const leaseId = process.argv[3] || process.env.LEASE_ID;

const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const timeoutFetch = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

const check = async () => {
  console.log('[SMOKE] Using API base:', API_BASE);
  console.log('[SMOKE] Local API default:', DEFAULT_LOCAL_API);
  console.log('[SMOKE] Deployed API default:', DEFAULT_DEPLOY_API);
  console.log('[SMOKE] Token provided:', token ? 'yes' : 'no');
  if (leaseId) console.log('[SMOKE] Lease ID:', leaseId);

  try {
    const health = await timeoutFetch(`${API_BASE}/health`, {}, 10000);
    console.log('[SMOKE] /health ->', health.data || health.status);
  } catch (err) {
    console.error('[SMOKE] /health failed:', err.message || err);
  }

  try {
    const meta = await timeoutFetch(`${API_BASE}/payments/metadata`, { headers: buildHeaders() }, 10000);
    console.log('[SMOKE] /payments/metadata ->', meta.data || meta.status);
  } catch (err) {
    console.error('[SMOKE] /payments/metadata failed:', err.message || err);
  }

  if (leaseId) {
    try {
      const co = await timeoutFetch(`${API_BASE}/payments/checkout/${leaseId}`, { headers: buildHeaders() }, 10000);
      console.log('[SMOKE] /payments/checkout/' + leaseId + ' ->', co.data || co.status);
    } catch (err) {
      console.error('[SMOKE] /payments/checkout failed:', err.message || err);
    }
  } else {
    console.log('[SMOKE] No lease id provided for checkout endpoint (optional).');
  }
};

check();
