// controllers/payment.controller.js
const db = require('../config/db');
const {
  createSubaccount,
  getBanks,
  resolveAccountNumber,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateReference,
  generateReceiptNumber,
} = require('../utils/paystack');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  sendPaymentReceiptEmail,
  sendLandlordPaymentAlert,
} = require('../utils/email');
const { sendPushNotification } = require('../utils/push');

const SERVICE_FEE = parseFloat(process.env.PAYMENT_SERVICE_FEE || '500');

// ── Helpers ───────────────────────────────────────────────────────────────────
const parsePagination = (query, defaultLimit = 20) => {
  const page   = Math.max(1, parseInt(query.page,  10) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// ── GET PAYMENT METADATA ─────────────────────────────────────────────────────
const getPaymentMetadata = asyncHandler(async (req, res) => {
  return res.status(200).json({
    message: 'Payment metadata retrieved successfully',
    data: { service_fee: SERVICE_FEE },
  });
});

// ── GET BANK LIST (public) ────────────────────────────────────────────────────
const getBankList = asyncHandler(async (req, res) => {
  const banks = await getBanks();
  return res.status(200).json({
    message: 'Banks retrieved successfully',
    data: banks,
  });
});

// ── RESOLVE ACCOUNT NUMBER ────────────────────────────────────────────────────
const resolveAccount = asyncHandler(async (req, res) => {
  const { account_number, bank_code } = req.query;

  if (!account_number || !bank_code) {
    return res.status(400).json({ error: 'account_number and bank_code are required.' });
  }
  if (!/^\d{10}$/.test(account_number)) {
    return res.status(400).json({ error: 'Account number must be exactly 10 digits.' });
  }

  const data = await resolveAccountNumber(account_number, bank_code);
  return res.status(200).json({
    account_name:   data.account_name,
    account_number: data.account_number,
    bank_id:        data.bank_id,
  });
});

// ── CREATE SUBACCOUNT (landlord bank setup) ───────────────────────────────────
const createLandlordSubaccount = asyncHandler(async (req, res) => {
  const {
    business_name,
    settlement_bank,
    account_number,
    bank_code,
    bank_name,
    percentage_charge,
  } = req.body;

  const landlordId = req.user.user_id;

  if (!business_name || !settlement_bank || !account_number) {
    return res.status(400).json({ error: 'Business name, bank, and account number are required.' });
  }

  const bankCodeToUse = bank_code || settlement_bank;

  // Resolve account name for verification before creating subaccount
  let accountName = '';
  try {
    const resolved = await resolveAccountNumber(account_number, bankCodeToUse);
    accountName = resolved.account_name;
  } catch {
    return res.status(400).json({
      error: 'Could not verify bank account number. Please check the details and try again.',
    });
  }

  const pct = typeof percentage_charge !== 'undefined' ? Number(percentage_charge) : 2;
  const sub = await createSubaccount({
    business_name,
    settlement_bank: bankCodeToUse,
    account_number,
    percentage_charge: pct,
  });

  const resolvedBankName = bank_name || sub.settlement_bank || settlement_bank;

  await db.query(
    `UPDATE users SET
       subaccount_code = $1,
       bank_name       = $2,
       account_number  = $3,
       account_name    = $4,
       updated_at      = NOW()
     WHERE user_id = $5`,
    [sub.subaccount_code, resolvedBankName, account_number, accountName, landlordId]
  );

  return res.status(200).json({
    message: 'Bank account connected successfully.',
    data: {
      subaccount_code: sub.subaccount_code,
      account_name:    accountName,
      bank:            resolvedBankName,
      account_number,
    },
  });
});

// ── GET CHECKOUT INFO ─────────────────────────────────────────────────────────
const getCheckoutInfo = asyncHandler(async (req, res) => {
  const lease_id  = req.params.lease_id || req.query.lease_id;
  const tenant_id = req.user.user_id;

  if (!lease_id) return res.status(400).json({ error: 'lease_id is required' });

  const result = await db.query(
    `SELECT l.lease_id, l.rent_amount,
            COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
            TO_CHAR(l.end_date,'YYYY-MM-DD') AS end_date,
            r.payment_frequency, u.subaccount_code
     FROM leases l
     JOIN rooms r ON l.room_id = r.room_id
     JOIN users u ON l.landlord_id = u.user_id
     WHERE l.lease_id = $1 AND l.tenant_id = $2`,
    [lease_id, tenant_id]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Lease not found' });

  const lease      = result.rows[0];
  const rentAmount = parseFloat(lease.rent_amount) || 0;
  const paid       = parseFloat(lease.amount_paid_this_cycle) || 0;
  const remaining  = Math.max(0, rentAmount - paid);

  return res.status(200).json({
    message: 'Checkout info retrieved successfully',
    data: {
      lease_id:          lease.lease_id,
      rent_amount:       rentAmount,
      service_fee:       SERVICE_FEE,
      minimum_amount:    rentAmount + SERVICE_FEE,
      remaining_balance: remaining,
      payment_frequency: lease.payment_frequency || 'monthly',
      due_date:          lease.end_date,
    },
  });
});

// ── INITIATE PAYMENT (tenant pays rent) ──────────────────────────────────────
const initiatePayment = asyncHandler(async (req, res) => {
  const { lease_id, amount } = req.body;
  const tenantId = req.user.user_id;

  if (!lease_id) return res.status(400).json({ error: 'Lease ID is required.' });

  const leaseResult = await db.query(
    `SELECT
       l.lease_id, l.tenant_id, l.landlord_id, l.rent_amount,
       COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
       TO_CHAR(l.end_date, 'YYYY-MM-DD') AS end_date,
       u_tenant.email      AS tenant_email,
       u_tenant.full_name  AS tenant_name,
       u_landlord.subaccount_code,
       u_landlord.hostel_name,
       r.room_number,
       p.property_name
     FROM leases l
     JOIN users u_tenant   ON l.tenant_id  = u_tenant.user_id
     JOIN users u_landlord ON l.landlord_id = u_landlord.user_id
     JOIN rooms r          ON l.room_id     = r.room_id
     JOIN properties p     ON r.property_id = p.property_id
     WHERE l.lease_id = $1 AND l.tenant_id = $2`,
    [lease_id, tenantId]
  );

  if (leaseResult.rows.length === 0) return res.status(404).json({ error: 'Lease not found.' });

  const lease         = leaseResult.rows[0];
  const isLive        = process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_live_');
  const rentAmount    = parseFloat(lease.rent_amount) || 0;
  const paid          = parseFloat(lease.amount_paid_this_cycle) || 0;
  const remaining     = Math.max(0, rentAmount - paid);

  if (remaining <= 0) {
    return res.status(400).json({ error: 'There is no outstanding rent due for this lease.' });
  }

  const requestedAmount = typeof amount !== 'undefined' ? parseFloat(amount) : NaN;
  const desiredRent = Number.isFinite(requestedAmount)
    ? Math.min(requestedAmount, remaining)
    : rentAmount;

  if (desiredRent <= 0) return res.status(400).json({ error: 'Invalid amount.' });
  if (!lease.subaccount_code && isLive) {
    return res.status(400).json({ error: 'Landlord has not set up a payment account.' });
  }

  const totalCharge   = desiredRent + SERVICE_FEE;
  const reference     = generateReference();
  const receiptNumber = generateReceiptNumber();
  const frontendUrl   = (process.env.FRONTEND_URL || 'https://pro-tech-one.vercel.app').replace(/\/+$/, '');

  const transaction = await initializeTransaction({
    email:           lease.tenant_email,
    amount_kobo:     Math.round(totalCharge * 100),
    reference,
    subaccount_code: lease.subaccount_code,
    callback_url:    `${frontendUrl}/payment/verify`,
    metadata: {
      lease_id:       lease.lease_id,
      tenant_id:      lease.tenant_id,
      landlord_id:    lease.landlord_id,
      rent_amount:    desiredRent,
      service_fee:    SERVICE_FEE,
      receipt_number: receiptNumber,
      room_number:    lease.room_number,
      property_name:  lease.property_name,
      hostel_name:    lease.hostel_name,
      tenant_name:    lease.tenant_name,
    },
  });

  // Store pending record (idempotent — ON CONFLICT DO NOTHING with unique index on paystack_ref)
  await db.query(
    `INSERT INTO payments
       (lease_id, tenant_id, landlord_id, amount_paid,
        service_fee, paystack_ref, receipt_number, payment_status, payment_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW())
     ON CONFLICT DO NOTHING`,
    [
      lease.lease_id, lease.tenant_id, lease.landlord_id,
      desiredRent, SERVICE_FEE, reference, receiptNumber,
    ]
  );

  return res.status(200).json({
    message: 'Payment initialized',
    data: {
      authorization_url: transaction.authorization_url,
      reference,
      receipt_number:    receiptNumber,
      service_fee:       SERVICE_FEE,
      amount_due:        desiredRent,
      rent_amount:       rentAmount,
      total_charged:     totalCharge,
    },
  });
});

// ── PAYSTACK WEBHOOK ──────────────────────────────────────────────────────────
// Raw body is supplied by express.raw() mounted in server.js BEFORE express.json().
const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody   = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}));

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[WEBHOOK] Invalid signature — rejected');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in webhook body.' });
    }

    if (!event || event.event !== 'charge.success') {
      return res.status(200).json({ received: true });
    }

    const data      = event.data;
    const reference = data.reference;
    const metadata  = data.metadata || {};

    // Idempotency check
    const existing = await db.query(
      'SELECT payment_id, payment_status FROM payments WHERE paystack_ref = $1',
      [reference]
    );

    if (existing.rows.length > 0 && existing.rows[0].payment_status === 'success') {
      console.log(`[WEBHOOK] Duplicate ignored: ${reference}`);
      return res.status(200).json({ received: true });
    }

    const {
      lease_id, tenant_id, landlord_id,
      rent_amount, service_fee, receipt_number,
      room_number, property_name, hostel_name, tenant_name,
    } = metadata;

    const rentPortion = parseFloat(rent_amount || 0) || Math.max(0, (data.amount / 100) - SERVICE_FEE);
    const feePortion  = parseFloat(service_fee  || SERVICE_FEE);

    // Upsert payment as success
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE payments SET payment_status = 'success', payment_date = NOW()
         WHERE paystack_ref = $1`,
        [reference]
      );
    } else {
      const newReceipt = receipt_number || generateReceiptNumber();
      await db.query(
        `INSERT INTO payments
           (lease_id, tenant_id, landlord_id, amount_paid, service_fee,
            paystack_ref, receipt_number, payment_status, payment_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'success',NOW())
         ON CONFLICT DO NOTHING`,
        [lease_id, tenant_id, landlord_id, rentPortion, feePortion, reference, newReceipt]
      );
    }

    // Credit rent to lease balance
    const leaseUpdate = await db.query(
      `UPDATE leases SET
         amount_paid_this_cycle = COALESCE(amount_paid_this_cycle, 0) + $1
       WHERE lease_id = $2
       RETURNING rent_amount, amount_paid_this_cycle,
                 TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date, room_id`,
      [rentPortion, lease_id]
    );

    const updatedLease = leaseUpdate.rows[0];

    // Mark room occupied if fully paid
    if (updatedLease && updatedLease.amount_paid_this_cycle >= updatedLease.rent_amount) {
      await db.query(
        'UPDATE rooms SET is_occupied = 1 WHERE room_id = $1',
        [updatedLease.room_id]
      );
    }

    const remaining      = updatedLease
      ? Math.max(0, updatedLease.rent_amount - updatedLease.amount_paid_this_cycle)
      : null;
    const finalReceipt   = receipt_number || reference;

    // Fetch tenant email
    const tenantRows = await db.query(
      'SELECT email, full_name FROM users WHERE user_id = $1',
      [tenant_id]
    );

    const tenantEmail    = tenantRows.rows[0]?.email;
    const tenantFullName = tenantRows.rows[0]?.full_name || tenant_name;

    // Send receipt email to tenant (fire and forget)
    if (tenantEmail) {
      sendPaymentReceiptEmail(tenantEmail, {
        tenant_name:   tenantFullName,
        hostel_name:   hostel_name || property_name,
        room_number,
        property_name,
        receipt_number: finalReceipt,
        amount_paid:   rentPortion,
        service_fee:   feePortion,
        total_charged: rentPortion + feePortion,
        end_date:      updatedLease?.end_date,
        remaining,
        paystack_ref:  reference,
      }).catch((err) => console.error('[RECEIPT EMAIL ERROR]', err.message));

      sendPushNotification(
        tenant_id,
        'Payment Confirmed ✅',
        `Your rent payment of ₦${rentPortion.toLocaleString('en-NG')} has been confirmed.`
      ).catch((err) => console.error('[PUSH ERROR]', err.message));
    }

    // Notify landlord (fire and forget)
    if (landlord_id) {
      const landlordRows = await db.query(
        'SELECT email, full_name FROM users WHERE user_id = $1',
        [landlord_id]
      );
      if (landlordRows.rows.length > 0) {
        sendLandlordPaymentAlert(landlordRows.rows[0].email, {
          landlord_name:  landlordRows.rows[0].full_name,
          tenant_name:    tenantFullName,
          room_number,
          amount_paid:    rentPortion,
          receipt_number: finalReceipt,
          remaining,
        }).catch((err) => console.error('[LANDLORD ALERT ERROR]', err.message));
      }
    }

    console.log(`[WEBHOOK] ✅ ${reference} | ₦${rentPortion.toLocaleString()} | Lease ${lease_id}`);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error?.stack || error?.message || error);
    return res.status(200).json({ received: true, warning: 'Processed with error' });
  }
};

// ── VERIFY PAYMENT (frontend poll after redirect) ─────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const userId  = req.user.user_id;
  const role    = req.user.role;

  if (!reference) return res.status(400).json({ error: 'Reference is required.' });

  const dbResult = await db.query(
    `SELECT
       p.payment_id, p.payment_status, p.amount_paid, p.service_fee,
       p.receipt_number, p.paystack_ref, p.tenant_id, p.landlord_id,
       TO_CHAR(p.payment_date AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD HH24:MI') AS payment_date,
       l.rent_amount, l.amount_paid_this_cycle,
       r.room_number, pr.property_name
     FROM payments p
     JOIN leases l      ON p.lease_id    = l.lease_id
     JOIN rooms r       ON l.room_id     = r.room_id
     JOIN properties pr ON r.property_id = pr.property_id
     WHERE p.paystack_ref = $1`,
    [reference]
  );

  if (dbResult.rows.length > 0) {
    const payment = dbResult.rows[0];

    if (
      payment.tenant_id !== userId &&
      payment.landlord_id !== userId &&
      role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Not authorized to view this payment.' });
    }

    if (payment.payment_status === 'success') {
      return res.status(200).json({ message: 'Payment retrieved successfully', data: payment });
    }
  }

  // Fallback: poll Paystack directly
  try {
    const paystackData = await verifyTransaction(reference);
    if (paystackData.status === 'success') {
      return res.status(200).json({
        message: 'Payment confirmed by Paystack. Finalising receipt...',
        data: { payment_status: 'pending', paystack_ref: reference },
      });
    }
    return res.status(200).json({
      message: paystackData.gateway_response || paystackData.status,
      data: { payment_status: paystackData.status, paystack_ref: reference },
    });
  } catch {
    return res.status(404).json({
      error: 'Payment not found. Contact support if you were charged.',
    });
  }
});

// ── PAYMENT HISTORY ───────────────────────────────────────────────────────────
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const role    = req.user.role;
  const user_id = req.user.user_id;

  const isTenant    = role === 'tenant';
  const whereClause = isTenant ? 'WHERE p.tenant_id = $1' : 'WHERE p.landlord_id = $1';

  const [countResult, result] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM payments p ${whereClause}`, [user_id]),
    db.query(
      `SELECT
         p.payment_id, p.lease_id, p.tenant_id, p.landlord_id,
         p.amount_paid, p.paystack_ref, p.subaccount_code,
         p.payment_status, p.receipt_number,
         TO_CHAR(p.payment_date AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS payment_date,
         p.service_fee, l.rent_amount,
         r.room_number, r.room_type, pr.property_name,
         u_tenant.full_name  AS tenant_name,
         u_tenant.username   AS tenant_username,
         u_tenant.email      AS tenant_email,
         u_landlord.hostel_name, u_landlord.hostel_address
       FROM payments p
       JOIN leases l      ON p.lease_id    = l.lease_id
       JOIN rooms r       ON l.room_id     = r.room_id
       JOIN properties pr ON r.property_id = pr.property_id
       JOIN users u_tenant   ON p.tenant_id   = u_tenant.user_id
       JOIN users u_landlord ON p.landlord_id  = u_landlord.user_id
       ${whereClause}
       ORDER BY p.payment_date DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    ),
  ]);

  return res.status(200).json({
    message: 'Payment history retrieved successfully',
    data: result.rows,
    meta: { total: parseInt(countResult.rows[0].count, 10), page, limit },
  });
});

// ── GET RECEIPT ───────────────────────────────────────────────────────────────
const getReceipt = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.user_id;

  const result = await db.query(
    `SELECT
       p.payment_id, p.lease_id, p.tenant_id, p.landlord_id,
       p.amount_paid, p.paystack_ref, p.subaccount_code,
       p.payment_status, p.receipt_number,
       TO_CHAR(p.payment_date AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS payment_date,
       p.service_fee, l.rent_amount,
       r.room_number, r.room_type, pr.property_name,
       u_tenant.full_name  AS tenant_name,
       u_tenant.username   AS tenant_username,
       u_tenant.email      AS tenant_email,
       u_landlord.hostel_name, u_landlord.hostel_address
     FROM payments p
     JOIN leases l      ON p.lease_id    = l.lease_id
     JOIN rooms r       ON l.room_id     = r.room_id
     JOIN properties pr ON r.property_id = pr.property_id
     JOIN users u_tenant   ON p.tenant_id   = u_tenant.user_id
     JOIN users u_landlord ON p.landlord_id  = u_landlord.user_id
     WHERE p.paystack_ref = $1
       AND (p.tenant_id = $2 OR p.landlord_id = $3)`,
    [reference, userId, userId]
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });
  return res.status(200).json({ message: 'Receipt retrieved successfully', data: result.rows[0] });
});

module.exports = {
  getPaymentMetadata,
  getBankList,
  resolveAccount,
  createLandlordSubaccount,
  getCheckoutInfo,
  initiatePayment,
  paystackWebhook,
  verifyPayment,
  getPaymentHistory,
  getReceipt,
};
