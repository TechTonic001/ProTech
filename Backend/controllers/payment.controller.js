// controllers/payment.controller.js
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const { sendPushNotification } = require('../utils/push');

const createLandlordSubaccount = async (req, res, next) => {
  try {
    const { business_name, settlement_bank, account_number, percentage_charge, bank_name } = req.body;
    const landlord_id = req.user.user_id;

    if (!business_name || !settlement_bank || !account_number || !percentage_charge) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const response = await axios.post(
        'https://api.paystack.co/subaccount',
        {
          business_name: business_name,
          settlement_bank: settlement_bank,
          account_number: account_number,
          percentage_charge: percentage_charge,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      const { subaccount_code } = response.data.data;

      // Save to database
      await pool.query(
        'UPDATE users SET subaccount_code = $1, bank_name = $2, account_number = $3, account_name = $4 WHERE user_id = $5',
        [subaccount_code, bank_name || settlement_bank, account_number, business_name, landlord_id]
      );

      return res.status(201).json({
        message: 'Subaccount created successfully',
        data: {
          subaccount_code,
          bank_name: bank_name || settlement_bank,
          account_number,
          account_name: business_name,
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
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
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
    const { lease_id } = req.body;
    const tenant_id = req.user.user_id;

    if (!lease_id) {
      return res.status(400).json({ error: 'Lease ID is required' });
    }

    // Get lease details
    const leaseResult = await pool.query(
      'SELECT l.*, u.subaccount_code, u.email, t.email as tenant_email FROM leases l JOIN users u ON l.landlord_id = u.user_id JOIN users t ON l.tenant_id = t.user_id WHERE l.lease_id = $1 AND l.tenant_id = $2',
      [lease_id, tenant_id]
    );

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];

    if (!lease.subaccount_code) {
      return res.status(400).json({ error: 'Landlord has not set up payment account' });
    }

    // Calculate amount (rent + 500 naira service fee)
    const amount_kobo = (parseFloat(lease.rent_amount) + 500) * 100;

    // Generate reference and receipt number
    const reference = 'PROTECH-' + Date.now();
    const receipt_number = 'REC-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: lease.tenant_email,
          amount: amount_kobo,
          reference: reference,
          subaccount: lease.subaccount_code,
          bearer: 'subaccount',
          callback_url: process.env.FRONTEND_URL + '/payment/verify',
          metadata: {
            lease_id: lease_id,
            tenant_id: tenant_id,
            receipt_number: receipt_number,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      return res.status(200).json({
        message: 'Payment initialized',
        data: {
          authorization_url: paystackResponse.data.data.authorization_url,
          reference: reference,
          receipt_number: receipt_number,
        },
      });
    } catch (paystackError) {
      return res.status(400).json({ error: paystackError.response?.data?.message || paystackError.message });
    }
  } catch (error) {
    next(error);
  }
};

const paystackWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.rawBody || JSON.stringify(req.body || {});
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

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

    // Check if payment already exists (prevent duplicates)
    const existingPaymentsResult = await pool.query(
      'SELECT payment_id FROM payments WHERE paystack_ref = $1',
      [reference]
    );

    if (existingPaymentsResult.rows.length > 0) {
      return res.status(200).json({ message: 'Payment already processed' });
    }

    // Get lease and landlord details
    const leasesResult = await pool.query(
      'SELECT l.*, u.subaccount_code, u.hostel_name, t.email as tenant_email, t.full_name as tenant_name FROM leases l JOIN users u ON l.landlord_id = u.user_id JOIN users t ON l.tenant_id = t.user_id WHERE l.lease_id = $1',
      [lease_id]
    );

    if (leasesResult.rows.length === 0) {
      return res.status(200).json({ message: 'Lease not found' });
    }

    const lease = leasesResult.rows[0];
    const landlord_id = lease.landlord_id;

    // Insert payment record
    await pool.query(
      'INSERT INTO payments (lease_id, tenant_id, landlord_id, amount_paid, paystack_ref, subaccount_code, payment_status, receipt_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        lease_id,
        tenant_id,
        landlord_id,
        amount / 100,
        reference,
        lease.subaccount_code,
        'success',
        receipt_number,
      ]
    );

    // Update room occupancy
    await pool.query(
      'UPDATE rooms SET is_occupied = 1 WHERE room_id = (SELECT room_id FROM leases WHERE lease_id = $1)',
      [lease_id]
    );

    // Send confirmation email
    const propertiesResult = await pool.query(
      'SELECT p.property_name, r.room_number FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = (SELECT room_id FROM leases WHERE lease_id = $1)',
      [lease_id]
    );

    if (propertiesResult.rows.length > 0) {
      sendPaymentConfirmationEmail(
        lease.tenant_email,
        lease.tenant_name,
        amount / 100,
        receipt_number,
        propertiesResult.rows[0].room_number,
        propertiesResult.rows[0].property_name,
        new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      ).catch((emailError) => console.error(`[ERROR] Failed to send payment confirmation email:`, emailError.message));
    }

    // Send push notification in background
    sendPushNotification(tenant_id, 'Payment Confirmed', `Your rent payment of ₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been confirmed.`)
      .catch((pushError) => console.error(`[ERROR] Failed to send payment push:`, pushError.message));

    return res.status(200).json({ message: 'Payment processed' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(200).json({ message: 'Webhook processed with error' });
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    let queryText = `
      SELECT
        p.*,
        l.rent_amount,
        r.room_number,
        r.room_type,
        pr.property_name,
        u_tenant.full_name AS tenant_name,
        u_tenant.username AS tenant_username,
        u_tenant.email AS tenant_email,
        u_landlord.hostel_name,
        u_landlord.hostel_address
      FROM payments p
      JOIN leases l ON p.lease_id = l.lease_id
      JOIN rooms r ON l.room_id = r.room_id
      JOIN properties pr ON r.property_id = pr.property_id
      JOIN users u_tenant ON p.tenant_id = u_tenant.user_id
      JOIN users u_landlord ON p.landlord_id = u_landlord.user_id
      WHERE ($1 = 'tenant' AND p.tenant_id = $2) OR ($3 != 'tenant' AND p.landlord_id = $4)
      ORDER BY p.payment_date DESC`;

    const result = await pool.query(queryText, [
      req.user.role,
      req.user.user_id,
      req.user.role,
      req.user.user_id,
    ]);

    return res.status(200).json({
      message: 'Payment history retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

const getReceipt = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT
        p.*,
        l.rent_amount,
        r.room_number,
        r.room_type,
        pr.property_name,
        u_tenant.full_name AS tenant_name,
        u_tenant.username AS tenant_username,
        u_tenant.email AS tenant_email,
        u_landlord.hostel_name,
        u_landlord.hostel_address
      FROM payments p
      JOIN leases l ON p.lease_id = l.lease_id
      JOIN rooms r ON l.room_id = r.room_id
      JOIN properties pr ON r.property_id = pr.property_id
      JOIN users u_tenant ON p.tenant_id = u_tenant.user_id
      JOIN users u_landlord ON p.landlord_id = u_landlord.user_id
      WHERE p.paystack_ref = $1 AND (p.tenant_id = $2 OR p.landlord_id = $3)`,
      [reference, userId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    return res.status(200).json({
      message: 'Receipt retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId = req.user.user_id;

    const result = await pool.query(
      'SELECT * FROM payments WHERE paystack_ref = $1 AND tenant_id = $2',
      [reference, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Payment not found',
      });
    }

    return res.status(200).json({
      message: 'Payment retrieved successfully',
      data: result.rows[0],
    });
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
