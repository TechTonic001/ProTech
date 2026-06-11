// controllers/payment.controller.js
const axios = require('axios');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const { sendPushNotification } = require('../utils/push');

const createLandlordSubaccount = async (req, res, next) => {
  try {
    const { business_name, settlement_bank, account_number, percentage_charge } = req.body;
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
      const connection = await pool.getConnection();
      await connection.query(
        'UPDATE users SET subaccount_code = ?, bank_name = ?, account_number = ?, account_name = ? WHERE user_id = ?',
        [subaccount_code, settlement_bank, account_number, business_name, landlord_id]
      );
      connection.release();

      return res.status(201).json({
        message: 'Subaccount created',
        data: {
          subaccount_code,
        },
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

    const connection = await pool.getConnection();

    // Get lease details
    const [leases] = await connection.query(
      'SELECT l.*, u.subaccount_code, u.email, t.email as tenant_email FROM leases l JOIN users u ON l.landlord_id = u.user_id JOIN users t ON l.tenant_id = t.user_id WHERE l.lease_id = ? AND l.tenant_id = ?',
      [lease_id, tenant_id]
    );

    if (leases.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leases[0];

    if (!lease.subaccount_code) {
      connection.release();
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

      connection.release();

      return res.status(200).json({
        message: 'Payment initialized',
        data: {
          authorization_url: paystackResponse.data.data.authorization_url,
          reference: reference,
          receipt_number: receipt_number,
        },
      });
    } catch (paystackError) {
      connection.release();
      return res.status(400).json({ error: paystackError.response?.data?.message || paystackError.message });
    }
  } catch (error) {
    next(error);
  }
};

const paystackWebhook = async (req, res, next) => {
  try {
    // Verify HMAC signature
    const signature = req.headers['x-paystack-signature'];
    const raw = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : req.rawBody || req._rawBody || '';
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(raw)
      .digest('hex');

    if (hash !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Only process charge.success events
    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const { reference, metadata, amount } = event.data;
    const { lease_id, tenant_id, receipt_number } = metadata;

    const connection = await pool.getConnection();

    // Check if payment already exists (prevent duplicates)
    const [existingPayments] = await connection.query(
      'SELECT payment_id FROM payments WHERE paystack_ref = ?',
      [reference]
    );

    if (existingPayments.length > 0) {
      connection.release();
      return res.status(200).json({ message: 'Payment already processed' });
    }

    // Get lease and landlord details
    const [leases] = await connection.query(
      'SELECT l.*, u.subaccount_code, t.email as tenant_email, t.full_name as tenant_name FROM leases l JOIN users u ON l.landlord_id = u.user_id JOIN users t ON l.tenant_id = t.user_id WHERE l.lease_id = ?',
      [lease_id]
    );

    if (leases.length === 0) {
      connection.release();
      return res.status(200).json({ message: 'Lease not found' });
    }

    const lease = leases[0];
    const landlord_id = lease.landlord_id;

    // Insert payment record
    await connection.query(
      'INSERT INTO payments (lease_id, tenant_id, landlord_id, amount_paid, paystack_ref, subaccount_code, payment_status, receipt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
    await connection.query(
      'UPDATE rooms SET is_occupied = 1 WHERE room_id = (SELECT room_id FROM leases WHERE lease_id = ?)',
      [lease_id]
    );

    connection.release();

    // Send confirmation email
    const [properties] = await pool.query(
      'SELECT p.property_name, r.room_number FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = (SELECT room_id FROM leases WHERE lease_id = ?)',
      [lease_id]
    );

    if (properties.length > 0) {
      await sendPaymentConfirmationEmail(
        lease.tenant_email,
        lease.tenant_name,
        amount / 100,
        receipt_number,
        properties[0].room_number,
        properties[0].property_name,
        new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      );
    }

    // Send push notification
    await sendPushNotification(tenant_id, 'Payment Confirmed', `Your rent payment of ₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been confirmed.`);

    return res.status(200).json({ message: 'Payment processed' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(200).json({ message: 'Webhook processed with error' });
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const connection = await pool.getConnection();

    let query = `SELECT p.*, l.rent_amount, r.room_number, pr.property_name, u.full_name as other_user_name
                 FROM payments p
                 JOIN leases l ON p.lease_id = l.lease_id
                 JOIN rooms r ON l.room_id = r.room_id
                 JOIN properties pr ON r.property_id = pr.property_id
                 JOIN users u ON (
                   CASE WHEN ? = 'tenant' THEN p.landlord_id = u.user_id ELSE p.tenant_id = u.user_id END
                 )
                 WHERE (? = 'tenant' AND p.tenant_id = ?) OR (? != 'tenant' AND p.landlord_id = ?)
                 ORDER BY p.payment_date DESC`;

    const [payments] = await connection.query(query, [
      req.user.role,
      req.user.role,
      req.user.user_id,
      req.user.role,
      req.user.user_id,
    ]);

    connection.release();

    return res.status(200).json({
      message: 'Payment history retrieved successfully',
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLandlordSubaccount,
  initiatePayment,
  paystackWebhook,
  getPaymentHistory,
};
