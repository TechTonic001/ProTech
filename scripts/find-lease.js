#!/usr/bin/env node
const fs = require('fs');
// Lightweight .env loader — avoid external deps
try {
  const envText = fs.readFileSync('./Backend/.env', 'utf8');
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.substring(0, idx);
    let val = trimmed.substring(idx + 1);
    // remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
} catch (err) {
  // ignore — fallback to existing env
}

const db = require('../Backend/config/db');

const run = async () => {
  try {
    const result = await db.query('SELECT lease_id, tenant_id, landlord_id, rent_amount FROM leases LIMIT 1');
    if (result.rows.length === 0) {
      console.log('No leases found in the database');
      process.exit(0);
    }
    console.log('Found lease:', result.rows[0]);
  } catch (err) {
    console.error('DB query failed:', err.message);
    process.exit(1);
  }
};

run();
