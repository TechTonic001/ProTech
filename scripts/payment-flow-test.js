#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'Backend', '.env');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.substring(0, idx);
    let val = trimmed.substring(idx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

const token = process.argv[2];
const leaseId = process.argv[3] || '1';
const DEFAULT_LOCAL_API = 'http://localhost:5001/api';
const DEFAULT_DEPLOY_API = 'https://protechbackend.vercel.app/api';
const API_BASE = process.env.API_BASE || process.env.BACKEND_URL || DEFAULT_LOCAL_API;

if (!token) {
  console.error('Usage: node scripts/payment-flow-test.js <TOKEN> [leaseId]');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
};

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (err) { body = text; }
  return { status: res.status, body };
};

const resultFile = path.join(__dirname, 'payment-flow-result.json');

const run = async () => {
  const report = { apiBase: API_BASE, leaseId, results: [], localApi: DEFAULT_LOCAL_API, deployedApi: DEFAULT_DEPLOY_API };
  try {
    const health = await fetchJson(`${API_BASE}/health`);
    report.results.push({ step: 'health', result: health });

    const metadata = await fetchJson(`${API_BASE}/payments/metadata`, { headers });
    report.results.push({ step: 'metadata', result: metadata });

    const checkout = await fetchJson(`${API_BASE}/payments/checkout/${leaseId}`, { headers });
    report.results.push({ step: 'checkout', result: checkout });

    const payload = {
      lease_id: Number(leaseId),
      amount: checkout.body?.data?.minimum_amount || 20500,
    };
    const initiate = await fetchJson(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    report.results.push({ step: 'initiate', result: initiate });

    fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
    console.log('Result written to', resultFile);
  } catch (err) {
    report.error = err && err.message ? err.message : String(err);
    fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
    console.error('ERROR', report.error);
    process.exit(1);
  }
};

run();
