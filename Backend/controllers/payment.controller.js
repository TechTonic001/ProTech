// controllers/payment.controller.js
const axios  = require('axios');
const crypto = require('crypto');
const pool   = require('../config/db');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const { sendPushNotification }         = require('../utils/push');

// Helper: parse pagination query params with sane defaults
const parsePagination = (query, defaultLimit = 20) => {
  const page   = Math.max(1, parseInt(query.page,  10) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const createLandlordSubaccount = async (req, res, next) => {
  try {
    const { business_name, settlement_bank, account_number, percentage_charge, bank_name } = req.body;
    const landlord_id = req.user.user_id;

    if (!business_name || !settlement_bank || !account_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const pct = typeof percentage_charge !== 'undefined' ? Number(percentage_charge) : 2;

    try {
      const response = await axios.post(
        'https://api.paystack.co/subaccount',
        { business_name, settlement_bank, account_number, percentage_charge: pct },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      const { subaccount_code, account_name } = response.data.data || {};

      await pool.query(
        'UPDATE users SET subaccount_code = $1, bank_name = $2, account_number = $3, account_name = $4 WHERE user_id = $5',
        [subaccount_code, bank_name || settlement_bank, account_number, account_name || business_name, landlord_id]
      );

      return res.status(200).json({
        message: 'Subaccount created successfully',
        data: {
          subaccount_code,
          account_name:  account_name || business_name,
          bank_name:     bank_name || settlement_bank,
          account_number,
        },
      });
    } catch (paystackError) {
      return res.status(400).json({ error: paystackError.response?.data?.message || paystackError.message });
    }
  } catch (error) {
    next(error);
  }
};

const getBankList = async (req, res, next) => {
  try {
    try {
      const response = await axios.get('https://api.paystack.co/bank?country=nigeria', {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      return res.status(200).json({
        message: 'Banks retrieved successfully',
        data: response.data.data,
      });
    } catch (paystackError) {
      return res.status(400).json({ error: paystackError.response?.data?.message || paystackError.message });
    }
  } catch (error) {
    next(error);
  }
};

const initiatePayment = async (req, res, next) => {
  try {
    const { lease_id, amount } = req.body;
    const tenant_id = req.user.user_id;

    if (!lease_id) {
      return res.status(400).json({ error: 'Lease ID is required' });
    }

    // Single query with explicit columns — no wildcard
    const leaseResult = await pool.query(
      `SELECT l.lease_id, l.landlord_id, l.tenant_id, l.room_id, l.rent_amount,
              u.subaccount_code,
              u.email  AS landlord_email,
              t.email  AS tenant_email
       FROM leases l
       JOIN users u ON l.landlord_id = u.user_id
       JOIN users t ON l.tenant_id   = t.user_id
       WHERE l.lease_id = $1 AND l.tenant_id = $2`,
      [lease_id, tenant_id]
    );

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];

    if (!lease.subaccount_code) {
      return res.status(400).json({ error: 'Landlord has not set up payment account' });
    }

    const rentAmount    = parseFloat(lease.rent_amount) || 0;
    const serviceFee    = 500;
    const desiredAmount = typeof amount !== 'undefined' ? parseFloat(amount) : (rentAmount + serviceFee);

    if (isNaN(desiredAmount) || desiredAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const amount_kobo    = Math.round(desiredAmount * 100);
    const reference      = `PT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const receipt_number = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email:        lease.tenant_email,
          amount:       amount_kobo,
          reference,
          subaccount:   lease.subaccount_code,
          bearer:       'subaccount',
          callback_url: `${(process.env.FRONTEND_URL || 'https://pro-tech-one.vercel.app').replace(/\/+$/, '')}/payment/verify`,
          metadata: { lease_id, tenant_id, receipt_number },
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );

      return res.status(200).json({
        message: 'Payment initialized',
        data: {
          authorization_url: paystackResponse.data.data.authorization_url,
          reference,
        },
      });
    } catch (paystackError) {
      return res.status(400).json({ error: paystackError.response?.data?.message || paystackError.message });
    }
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK — optimized: 3 DB round-trips → 1 (duplicate check) + 1 (full JOIN)
// Room occupancy update uses the room_id already in the JOIN result.
// Property/room info for the confirmation email comes from the same JOIN.
// ─────────────────────────────────────────────────────────────────────────────
const paystackWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody   = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.rawBody || JSON.stringify(req.body || {});
    const hash      = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');

    if (hash !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    if (Buffer.isBuffer(req.body)) {
      event = JSON.parse(req.body.toString('utf8'));
    } else if (typeof req.body === 'string') {
      event = JSON.parse(req.body);
    } else {
      event = req.body;
    }

    if (!event || event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const { reference, metadata, amount } = event.data;
    const { lease_id, tenant_id, receipt_number } = metadata;

    // QUERY 1: Idempotency check — is this payment already recorded?
    const existingPayment = await pool.query(
      'SELECT payment_id FROM payments WHERE paystack_ref = $1',
      [reference]
    );
    if (existingPayment.rows.length > 0) {
      return res.status(200).json({ message: 'Payment already processed' });
    }

    // QUERY 2: Single JOIN fetches lease, landlord, tenant, room, and property
    // — eliminates the previous separate property/room lookup query entirely.
    const leaseResult = await pool.query(
      `SELECT
         l.lease_id, l.landlord_id, l.room_id,
         u_landlord.subaccount_code,
         u_landlord.hostel_name,
         u_tenant.email     AS tenant_email,
         u_tenant.full_name AS tenant_name,
         r.room_number,
         p.property_name
       FROM leases l
       JOIN users u_landlord ON l.landlord_id = u_landlord.user_id
       JOIN users u_tenant   ON l.tenant_id   = u_tenant.user_id
       JOIN rooms r          ON l.room_id      = r.room_id
       JOIN properties p     ON r.property_id  = p.property_id
       WHERE l.lease_id = $1`,
      [lease_id]
    );

    if (leaseResult.rows.length === 0) {
      return res.status(200).json({ message: 'Lease not found' });
    }

    const lease       = leaseResult.rows[0];
    const landlord_id = lease.landlord_id;

    // QUERY 3: Insert payment record
    await pool.query(
      `INSERT INTO payments
         (lease_id, tenant_id, landlord_id, amount_paid, paystack_ref,
          subaccount_code, payment_status, receipt_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [lease_id, tenant_id, landlord_id, amount / 100, reference, lease.subaccount_code, 'success', receipt_number]
    );

    // QUERY 4: Update room occupancy — uses room_id from JOIN result, NOT a subquery
    await pool.query(
      'UPDATE rooms SET is_occupied = 1 WHERE room_id = $1',
      [lease.room_id]
    );

    // Send confirmation email — uses property/room data from the JOIN above (no extra query)
    sendPaymentConfirmationEmail(
      lease.tenant_email,
      lease.tenant_name,
      amount / 100,
      receipt_number,
      lease.room_number,
      lease.property_name,
      new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
    ).catch((emailError) => console.error('[ERROR] Failed to send payment confirmation email:', emailError.message));

    // Push notification — fire-and-forget
    sendPushNotification(
      tenant_id,
      'Payment Confirmed',
      `Your rent payment of ₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been confirmed.`
    ).catch((pushError) => console.error('[ERROR] Failed to send payment push:', pushError.message));

    return res.status(200).json({ message: 'Payment processed' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(200).json({ message: 'Webhook processed with error' });
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const role    = req.user.role;
    const user_id = req.user.user_id;

    // Build WHERE clause based on role — avoids the confusing ($1='tenant' AND ...) OR (...) pattern
    const isTenant = role === 'tenant';
    const countParams = [user_id];
    const dataParams  = [user_id, limit, offset];

    const whereClause = isTenant
      ? 'WHERE p.tenant_id = $1'
      : 'WHERE p.landlord_id = $1';

    const [countResult, result] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM payments p ${whereClause}`,
        countParams
      ),
      pool.query(
        `SELECT
           p.payment_id, p.lease_id, p.tenant_id, p.landlord_id,
           p.amount_paid, p.paystack_ref, p.subaccount_code,
           p.payment_status, p.receipt_number, p.payment_date,
           l.rent_amount,
           r.room_number, r.room_type,
           pr.property_name,
           u_tenant.full_name  AS tenant_name,
           u_tenant.username   AS tenant_username,
           u_tenant.email      AS tenant_email,
           u_landlord.hostel_name,
           u_landlord.hostel_address
         FROM payments p
         JOIN leases l      ON p.lease_id    = l.lease_id
         JOIN rooms r       ON l.room_id     = r.room_id
         JOIN properties pr ON r.property_id = pr.property_id
         JOIN users u_tenant   ON p.tenant_id   = u_tenant.user_id
         JOIN users u_landlord ON p.landlord_id  = u_landlord.user_id
         ${whereClause}
         ORDER BY p.payment_date DESC
         LIMIT $2 OFFSET $3`,
        dataParams
      ),
    ]);

    return res.status(200).json({
      message: 'Payment history retrieved successfully',
      data:    result.rows,
      meta: {
        total:  parseInt(countResult.rows[0].count),
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getReceipt = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId        = req.user.user_id;

    const result = await pool.query(
      `SELECT
         p.payment_id, p.lease_id, p.tenant_id, p.landlord_id,
         p.amount_paid, p.paystack_ref, p.subaccount_code,
         p.payment_status, p.receipt_number, p.payment_date,
         l.rent_amount,
         r.room_number, r.room_type,
         pr.property_name,
         u_tenant.full_name  AS tenant_name,
         u_tenant.username   AS tenant_username,
         u_tenant.email      AS tenant_email,
         u_landlord.hostel_name,
         u_landlord.hostel_address
       FROM payments p
       JOIN leases l      ON p.lease_id    = l.lease_id
       JOIN rooms r       ON l.room_id     = r.room_id
       JOIN properties pr ON r.property_id = pr.property_id
       JOIN users u_tenant   ON p.tenant_id   = u_tenant.user_id
       JOIN users u_landlord ON p.landlord_id  = u_landlord.user_id
       WHERE p.paystack_ref = $1 AND (p.tenant_id = $2 OR p.landlord_id = $3)`,
      [reference, userId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    return res.status(200).json({
      message: 'Receipt retrieved successfully',
      data:    result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId        = req.user.user_id;
    const userRole      = req.user.role;

    // Explicit columns — no SELECT *
    const result = await pool.query(
      `SELECT payment_id, lease_id, tenant_id, landlord_id,
              amount_paid, paystack_ref, payment_status,
              receipt_number, payment_date
       FROM payments
       WHERE paystack_ref = $1`,
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.rows[0];

    if (payment.tenant_id !== userId && payment.landlord_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this payment' });
    }

    return res.status(200).json({ message: 'Payment retrieved successfully', data: payment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLandlordSubaccount,
  getBankList,
  initiatePayment,
  paystackWebhook,
  getPaymentHistory,
  getReceipt,
  verifyPayment,
};
