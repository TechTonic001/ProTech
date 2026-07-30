// utils/paystack.js
// Central Paystack API utility — uses Node's built-in https module (no axios).
// All controllers that touch Paystack must import from here, never call the
// Paystack REST API directly.

const crypto = require('crypto');
const https  = require('https');

const SECRET = process.env.PAYSTACK_SECRET_KEY;

// Detect test vs live mode automatically from the key prefix
const MODE = SECRET?.startsWith('sk_live_') ? 'LIVE' : 'TEST';
console.log(`[PAYSTACK] Running in ${MODE} mode`);

/**
 * Generic Paystack REST API caller.
 * Returns the parsed `data` object on success.
 * Rejects with an Error (using Paystack's message) on failure.
 */
const paystackRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${SECRET}`,
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === false) {
            reject(new Error(parsed.message || 'Paystack request failed'));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error('Invalid JSON response from Paystack'));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

/**
 * Verify the HMAC-SHA512 webhook signature.
 * MUST be called with the RAW Buffer body — NOT the parsed JSON object.
 * If express.json() runs first the body is already consumed and this fails.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  if (!signature || !SECRET) return false;
  const hash = crypto
    .createHmac('sha512', SECRET)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
};

/**
 * Create a Paystack subaccount so rent payments can be split and
 * settled directly into the landlord's bank account.
 */
const createSubaccount = async ({
  business_name,
  settlement_bank,
  account_number,
  percentage_charge = 2,
}) => {
  const result = await paystackRequest('POST', '/subaccount', {
    business_name,
    settlement_bank,
    account_number,
    percentage_charge,
    primary_contact_email:
      process.env.ADMIN_EMAIL || 'protech78902@gmail.com',
  });
  return result.data;
};

/**
 * Resolve a bank account number to get the account holder's name.
 * Used to verify landlord bank details before saving.
 */
const resolveAccountNumber = async (account_number, bank_code) => {
  const result = await paystackRequest(
    'GET',
    `/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`
  );
  return result.data;
};

/**
 * Fetch Nigerian banks from Paystack.
 * In-memory cache, valid for 1 hour.
 */
let _bankCache = null;
let _bankCacheTime = 0;

const getBanks = async () => {
  const now = Date.now();
  if (_bankCache && now - _bankCacheTime < 3_600_000) return _bankCache;
  const result = await paystackRequest('GET', '/bank?country=nigeria&perPage=100');
  _bankCache     = result.data;
  _bankCacheTime = now;
  return _bankCache;
};

/**
 * Initialise a Paystack transaction.
 * Returns { authorization_url, reference, access_code }.
 */
const initializeTransaction = async ({
  email,
  amount_kobo,
  reference,
  subaccount_code,
  callback_url,
  metadata = {},
}) => {
  const body = {
    email,
    amount: amount_kobo,
    reference,
    callback_url,
    metadata,
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
  };

  if (subaccount_code) {
    body.subaccount = subaccount_code;
    body.bearer     = 'subaccount';
  }

  const result = await paystackRequest('POST', '/transaction/initialize', body);
  return result.data;
};

/**
 * Verify a transaction reference with Paystack.
 * Fallback poll for the frontend when the webhook hasn't arrived yet.
 */
const verifyTransaction = async (reference) => {
  const result = await paystackRequest(
    'GET',
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  return result.data;
};

/**
 * Generate a unique payment reference.
 * Format: PT-[base36 timestamp]-[6 random chars]
 */
const generateReference = () => {
  const ts     = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PT-${ts}-${random}`;
};

/**
 * Generate a human-readable receipt number.
 * Format: REC-YYYY-MM-PT[8 hex chars]
 */
const generateReceiptNumber = () => {
  const now = new Date();
  const yr  = now.getFullYear();
  const mo  = String(now.getMonth() + 1).padStart(2, '0');
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `REC-${yr}-${mo}-PT${hex}`;
};

module.exports = {
  createSubaccount,
  getBanks,
  resolveAccountNumber,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateReference,
  generateReceiptNumber,
  MODE,
};
