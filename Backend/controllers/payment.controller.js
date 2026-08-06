// controllers/payment.controller.js
const db = require("../config/db");
const {
  createSubaccount,
  updateSubaccount,
  getBanks,
  resolveAccountNumber,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateReference,
  generateReceiptNumber,
} = require("../utils/paystack");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  sendPaymentReceiptEmail,
  sendLandlordPaymentAlert,
  sendPaymentReceiptToBoth,
} = require("../utils/email");
const { sendPushNotification } = require("../utils/push");
const { notifyLandlord, notifyTenant } = require("../utils/sseManager");
const { hasLandlordPaymentSetup } = require("../utils/paymentGuard");

const SERVICE_FEE = parseFloat(process.env.PAYMENT_SERVICE_FEE || "500");

const finalizePaymentSuccess = async (transaction) => {
  // transaction may be the webhook data object (event.data) or the verifyTransaction result.
  const tx = transaction.data ? transaction.data : transaction;
  const reference = tx.reference || "";
  const metadata = tx.metadata || {};
  const lease_id = metadata.lease_id;
  const tenant_id = metadata.tenant_id;
  const landlord_id = metadata.landlord_id;

  // Amount from Paystack is in kobo when present on tx.amount; fall back to metadata.rent_amount
  const amountFromTx =
    typeof tx.amount !== "undefined" ? Number(tx.amount) / 100 : NaN;
  const rentPortion =
    parseFloat(metadata.rent_amount || 0) ||
    (!Number.isNaN(amountFromTx) ? Math.max(0, amountFromTx - SERVICE_FEE) : 0);
  const feePortion = parseFloat(metadata.service_fee || SERVICE_FEE);
  const receiptNumber = metadata.receipt_number || generateReceiptNumber();
  const paymentSubaccount = metadata.subaccount_code || tx.subaccount || "";

  // Idempotency: ignore if payment already recorded as successful/partial
  const existing = await db.query(
    "SELECT payment_id, payment_status FROM payments WHERE paystack_ref = $1",
    [reference],
  );
  if (existing.rows.length > 0) {
    const cs = (existing.rows[0].payment_status || "").toString().toLowerCase();
    if (
      cs === "success" ||
      cs === "paid" ||
      cs === "partial" ||
      cs === "completed"
    )
      return;
  }

  // Update lease paid amount if lease exists
  let updatedLease = null;
  if (lease_id) {
    const leaseUpdate = await db.query(
      `UPDATE leases SET
         amount_paid_this_cycle = COALESCE(amount_paid_this_cycle, 0) + $1
       WHERE lease_id = $2
       RETURNING rent_amount, amount_paid_this_cycle, TO_CHAR(end_date,'YYYY-MM-DD') AS end_date, payment_frequency, room_id`,
      [rentPortion, lease_id],
    );
    updatedLease = leaseUpdate.rows[0] || null;
  }

  const isFullPayment = updatedLease
    ? parseFloat(updatedLease.amount_paid_this_cycle || 0) >=
      parseFloat(updatedLease.rent_amount || 0)
    : true;
  const paymentStatus = isFullPayment ? "success" : "pending";

  // Upsert payment record
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE payments SET
         payment_status  = $1,
         payment_date    = NOW(),
         amount_paid     = $2,
         service_fee     = $3,
         receipt_number  = $4,
         subaccount_code = $5
       WHERE paystack_ref = $6`,
      [
        paymentStatus,
        rentPortion,
        feePortion,
        receiptNumber,
        paymentSubaccount,
        reference,
      ],
    );
  } else {
    await db.query(
      `INSERT INTO payments
         (lease_id, tenant_id, landlord_id, amount_paid,
          service_fee, paystack_ref, receipt_number, payment_status,
          payment_date, subaccount_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9)
       ON CONFLICT DO NOTHING`,
      [
        lease_id,
        tenant_id,
        landlord_id,
        rentPortion,
        feePortion,
        reference,
        receiptNumber,
        paymentStatus,
        paymentSubaccount,
      ],
    );
  }

  // If lease is now fully paid, renew the lease for the next cycle and reset the paid balance.
  if (updatedLease && isFullPayment) {
    await db.query("UPDATE rooms SET is_occupied = 1 WHERE room_id = $1", [
      updatedLease.room_id,
    ]);

    try {
      const roomResult = await db.query(
        `SELECT payment_frequency FROM rooms WHERE room_id = $1`,
        [updatedLease.room_id],
      );
      const roomFrequency = roomResult.rows[0]?.payment_frequency || updatedLease.payment_frequency || "monthly";
      const normalizedFrequency = `${roomFrequency || "monthly"}`.toLowerCase();
      const currentEndDate = updatedLease.end_date ? new Date(updatedLease.end_date) : new Date();
      const nextEndDate = new Date(currentEndDate);

      if (normalizedFrequency === "yearly" || normalizedFrequency === "annually") {
        nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
      } else {
        nextEndDate.setMonth(nextEndDate.getMonth() + 1);
      }

      await db.query(
        `UPDATE leases
         SET end_date = $1,
             amount_paid_this_cycle = 0,
             rent_amount = COALESCE(rent_amount, 0)
         WHERE lease_id = $2`,
        [nextEndDate.toISOString().slice(0, 10), lease_id],
      );
    } catch (e) {
      console.error("[PAYMENT] Lease renewal failed", e?.message || e);
    }
  }

  if (tenant_id) {
    notifyTenant(tenant_id, "payment_confirmed", {
      lease_id,
      amount_paid: rentPortion,
      amount_paid_total: updatedLease
        ? updatedLease.amount_paid_this_cycle
        : null,
      rent_amount: updatedLease ? updatedLease.rent_amount : null,
      remaining: updatedLease
        ? Math.max(
            0,
            updatedLease.rent_amount - updatedLease.amount_paid_this_cycle,
          )
        : null,
      is_fully_paid: isFullPayment,
      receipt_number: receiptNumber,
    });
  }

  if (landlord_id) {
    notifyLandlord(landlord_id, "payment_received", {
      lease_id,
      tenant_id,
      tenant_name: metadata.tenant_name,
      room_number: metadata.room_number,
      amount_paid: rentPortion,
      amount_paid_total: updatedLease
        ? updatedLease.amount_paid_this_cycle
        : null,
      rent_amount: updatedLease ? updatedLease.rent_amount : null,
      remaining: updatedLease
        ? Math.max(
            0,
            updatedLease.rent_amount - updatedLease.amount_paid_this_cycle,
          )
        : null,
      is_fully_paid: isFullPayment,
      end_date: updatedLease?.end_date,
      receipt_number: receiptNumber,
    });
  }

  // Notify tenant
  if (tenant_id) {
    const tenantRows = await db.query(
      "SELECT email, full_name FROM users WHERE user_id = $1",
      [tenant_id],
    );
    const tenantEmail = tenantRows.rows[0]?.email;
    const tenantFullName =
      tenantRows.rows[0]?.full_name || metadata.tenant_name;
    if (tenantEmail) {
      // try to determine landlord email for CC
      let landlordEmail = null;
      if (landlord_id) {
        const lrows = await db.query(
          "SELECT email, full_name FROM users WHERE user_id = $1",
          [landlord_id],
        );
        landlordEmail = lrows.rows[0]?.email || null;
      }
      if (!landlordEmail && metadata.property_id) {
        const pRows = await db.query(
          `SELECT u.email, u.full_name FROM users u JOIN properties p ON p.landlord_id = u.user_id WHERE p.property_id = $1`,
          [metadata.property_id],
        );
        landlordEmail = pRows.rows[0]?.email || null;
      }

      const payload = {
        tenant_name: tenantFullName,
        hostel_name: metadata.hostel_name || metadata.property_name,
        room_number: metadata.room_number,
        property_name: metadata.property_name,
        receipt_number: receiptNumber,
        amount_paid: rentPortion,
        service_fee: feePortion,
        total_charged: rentPortion + feePortion,
        end_date: updatedLease?.end_date,
        remaining: updatedLease
          ? Math.max(
              0,
              updatedLease.rent_amount - updatedLease.amount_paid_this_cycle,
            )
          : null,
        paystack_ref: reference,
      };

      // Send receipt to tenant and CC landlord if available. Errors are logged but don't block webhook response.
      try {
        await sendPaymentReceiptToBoth(tenantEmail, landlordEmail, payload);
      } catch (err) {
        console.error("[RECEIPT EMAIL ERROR]", err?.message || err);
      }

      sendPushNotification(
        tenant_id,
        "Payment Confirmed ✅",
        `Your rent payment of ₦${rentPortion.toLocaleString("en-NG")} has been recorded.`,
      ).catch((err) => console.error("[PUSH ERROR]", err.message));
    }
  }

  // Notify landlord
  if (landlord_id) {
    const landlordRows = await db.query(
      "SELECT email, full_name FROM users WHERE user_id = $1",
      [landlord_id],
    );
    if (landlordRows.rows.length > 0) {
      sendLandlordPaymentAlert(landlordRows.rows[0].email, {
        landlord_name: landlordRows.rows[0].full_name,
        tenant_name: metadata.tenant_name,
        room_number: metadata.room_number,
        amount_paid: rentPortion,
        receipt_number: receiptNumber,
        remaining: updatedLease
          ? Math.max(
              0,
              updatedLease.rent_amount - updatedLease.amount_paid_this_cycle,
            )
          : null,
      }).catch((err) => console.error("[LANDLORD ALERT ERROR]", err.message));
    }
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parsePagination = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit, 10) || defaultLimit),
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// ── GET PAYMENT METADATA ─────────────────────────────────────────────────────
const getPaymentMetadata = asyncHandler(async (req, res) => {
  return res.status(200).json({
    message: "Payment metadata retrieved successfully",
    data: { service_fee: SERVICE_FEE },
  });
});

// ── GET BANK LIST (public) ────────────────────────────────────────────────────
const getBankList = asyncHandler(async (req, res) => {
  const banks = await getBanks();
  return res.status(200).json({
    message: "Banks retrieved successfully",
    data: banks,
  });
});

// ── RESOLVE ACCOUNT NUMBER ────────────────────────────────────────────────────
const resolveAccount = asyncHandler(async (req, res) => {
  const { account_number, bank_code } = req.query;

  if (!account_number || !bank_code) {
    return res
      .status(400)
      .json({ error: "account_number and bank_code are required." });
  }
  if (!/^\d{10}$/.test(account_number)) {
    return res
      .status(400)
      .json({ error: "Account number must be exactly 10 digits." });
  }

  const data = await resolveAccountNumber(account_number, bank_code);
  return res.status(200).json({
    account_name: data.account_name,
    account_number: data.account_number,
    bank_id: data.bank_id,
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
    return res
      .status(400)
      .json({ error: "Business name, bank, and account number are required." });
  }

  const bankCodeToUse = bank_code || settlement_bank;

  // Resolve account name for verification before creating or updating subaccount
  let accountName = "";
  try {
    const resolved = await resolveAccountNumber(account_number, bankCodeToUse);
    accountName = resolved.account_name;
  } catch {
    return res.status(400).json({
      error:
        "Could not verify bank account number. Please check the details and try again.",
    });
  }

  const existingUser = await db.query(
    `SELECT subaccount_code FROM users WHERE user_id = $1`,
    [landlordId]
  );

  const pct =
    typeof percentage_charge !== "undefined" ? Number(percentage_charge) : 2;
  let sub;
  const existingSubaccountCode = existingUser.rows[0]?.subaccount_code;
  if (existingSubaccountCode) {
    sub = await updateSubaccount({
      subaccount_code: existingSubaccountCode,
      business_name,
      settlement_bank: bankCodeToUse,
      account_number,
      percentage_charge: pct,
    });
  } else {
    sub = await createSubaccount({
      business_name,
      settlement_bank: bankCodeToUse,
      account_number,
      percentage_charge: pct,
    });
  }

  const resolvedBankName = bank_name || sub.settlement_bank || settlement_bank;
  const subaccountCode = sub.subaccount_code || existingSubaccountCode;

  await db.query(
    `UPDATE users SET
       subaccount_code = $1,
       bank_name       = $2,
       account_number  = $3,
       account_name    = $4,
       updated_at      = NOW()
     WHERE user_id = $5`,
    [
      subaccountCode,
      resolvedBankName,
      account_number,
      accountName,
      landlordId,
    ],
  );

  return res.status(200).json({
    message: "Bank account connected successfully.",
    data: {
      subaccount_code: subaccountCode,
      account_name: accountName,
      bank: resolvedBankName,
      account_number,
    },
  });
});

const getLandlordBankDetails = asyncHandler(async (req, res) => {
  const landlordId = req.user.user_id;
  const result = await db.query(
    `SELECT subaccount_code, bank_name, account_number, account_name
     FROM users
     WHERE user_id = $1`,
    [landlordId],
  );

  const bankDetails = result.rows[0] || null;
  return res.status(200).json({
    message: "Bank details retrieved successfully.",
    data: bankDetails,
  });
});

// ── GET CHECKOUT INFO ─────────────────────────────────────────────────────────
const getCheckoutInfo = asyncHandler(async (req, res) => {
  const lease_id = req.params.lease_id || req.query.lease_id;
  const tenant_id = req.user.user_id;

  if (!lease_id) return res.status(400).json({ error: "lease_id is required" });

  const result = await db.query(
    `SELECT l.lease_id, l.rent_amount,
            COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
            TO_CHAR(l.end_date,'YYYY-MM-DD') AS end_date,
            r.payment_frequency, u.subaccount_code
     FROM leases l
     JOIN rooms r ON l.room_id = r.room_id
     JOIN users u ON l.landlord_id = u.user_id
     WHERE l.lease_id = $1 AND l.tenant_id = $2`,
    [lease_id, tenant_id],
  );

  if (result.rows.length === 0)
    return res.status(404).json({ error: "Lease not found" });

  const lease = result.rows[0];
  const rentAmount = parseFloat(lease.rent_amount) || 0;
  const paid = parseFloat(lease.amount_paid_this_cycle) || 0;
  const remaining = Math.max(0, rentAmount - paid);

  return res.status(200).json({
    message: "Checkout info retrieved successfully",
    data: {
      lease_id: lease.lease_id,
      rent_amount: rentAmount,
      service_fee: SERVICE_FEE,
      minimum_amount: rentAmount + SERVICE_FEE,
      remaining_balance: remaining,
      payment_frequency: lease.payment_frequency || "monthly",
      due_date: lease.end_date,
    },
  });
});

// ── INITIATE PAYMENT (tenant pays rent) ──────────────────────────────────────
const initiatePayment = asyncHandler(async (req, res) => {
  const { lease_id, amount, email } = req.body;
  const tenantId = req.user.user_id;

  if (!lease_id)
    return res.status(400).json({ error: "Lease ID is required." });

  const leaseResult = await db.query(
    `SELECT
       l.lease_id, l.tenant_id, l.landlord_id, l.rent_amount,
       COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
       TO_CHAR(l.end_date, 'YYYY-MM-DD') AS end_date,
       u_tenant.email      AS tenant_email,
       u_tenant.full_name  AS tenant_name,
       u_landlord.subaccount_code,
       u_landlord.bank_name,
       u_landlord.account_number,
       u_landlord.account_name,
       u_landlord.hostel_name,
       r.room_number,
       p.property_name
     FROM leases l
     JOIN users u_tenant   ON l.tenant_id  = u_tenant.user_id
     JOIN users u_landlord ON l.landlord_id = u_landlord.user_id
     JOIN rooms r          ON l.room_id     = r.room_id
     JOIN properties p     ON r.property_id = p.property_id
     WHERE l.lease_id = $1 AND l.tenant_id = $2`,
    [lease_id, tenantId],
  );

  if (leaseResult.rows.length === 0)
    return res.status(404).json({ error: "Lease not found." });

  const lease = leaseResult.rows[0];
  const isLive = process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_");
  const rentAmount = parseFloat(lease.rent_amount) || 0;
  const paid = parseFloat(lease.amount_paid_this_cycle) || 0;
  const remaining = Math.max(0, rentAmount - paid);

  if (remaining <= 0) {
    return res
      .status(400)
      .json({ error: "There is no outstanding rent due for this lease." });
  }

  const requestedAmount =
    typeof amount !== "undefined" ? parseFloat(amount) : NaN;
  if (typeof amount !== "undefined" && Number.isNaN(requestedAmount)) {
    return res.status(400).json({ error: "Amount must be a valid number." });
  }

  const desiredRent = Number.isFinite(requestedAmount)
    ? requestedAmount
    : remaining;

  if (desiredRent <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }

  if (desiredRent > remaining) {
    return res
      .status(400)
      .json({ error: "Amount cannot exceed the remaining balance." });
  }

  const paystackEmail = email || lease.tenant_email;
  if (!paystackEmail) {
    return res
      .status(400)
      .json({ error: "Tenant email is required to initialize payment." });
  }

  if (desiredRent <= 0)
    return res.status(400).json({ error: "Invalid amount." });

  const landlordPaymentSetup = hasLandlordPaymentSetup({
    subaccount_code: lease.subaccount_code,
    bank_name: lease.bank_name,
    account_number: lease.account_number,
    account_name: lease.account_name,
  });

  if (!landlordPaymentSetup) {
    return res.status(400).json({
      error: "Payment unavailable: Please contact your landlord to update their bank details.",
    });
  }

  const totalCharge = desiredRent + SERVICE_FEE;
  const reference = generateReference();
  const receiptNumber = generateReceiptNumber();
  const frontendUrl = (
    process.env.FRONTEND_URL || "https://pro-tech-one.vercel.app"
  ).replace(/\/+$/, "");

  const transaction = await initializeTransaction({
    email: paystackEmail,
    amount_kobo: Math.round(totalCharge * 100),
    reference,
    subaccount_code: lease.subaccount_code,
    callback_url: `${frontendUrl}/payment/verify`,
    metadata: {
      lease_id: lease.lease_id,
      tenant_id: lease.tenant_id,
      landlord_id: lease.landlord_id,
      property_id: lease.property_id,
      rent_amount: desiredRent,
      service_fee: SERVICE_FEE,
      receipt_number: receiptNumber,
      subaccount_code: lease.subaccount_code,
      room_number: lease.room_number,
      property_name: lease.property_name,
      hostel_name: lease.hostel_name,
      tenant_name: lease.tenant_name,
    },
  });

  // Store pending record (idempotent — ON CONFLICT DO NOTHING with unique index on paystack_ref)
  await db.query(
    `INSERT INTO payments
       (lease_id, tenant_id, landlord_id, amount_paid,
        service_fee, paystack_ref, receipt_number, payment_status, payment_date, subaccount_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW(),$8)
     ON CONFLICT DO NOTHING`,
    [
      lease.lease_id,
      lease.tenant_id,
      lease.landlord_id,
      desiredRent,
      SERVICE_FEE,
      reference,
      receiptNumber,
      lease.subaccount_code,
    ],
  );

  return res.status(200).json({
    message: "Payment initialized",
    data: {
      authorization_url: transaction.authorization_url,
      reference,
      receipt_number: receiptNumber,
      service_fee: SERVICE_FEE,
      amount_due: desiredRent,
      rent_amount: rentAmount,
      total_charged: totalCharge,
    },
  });
});

// ── PAYSTACK WEBHOOK ──────────────────────────────────────────────────────────
// Raw body is supplied by express.raw() mounted in server.js BEFORE express.json().
const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}));

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[WEBHOOK] Invalid signature — rejected");
      return res.status(400).json({ error: "Invalid webhook signature." });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON in webhook body." });
    }

    if (!event || event.event !== "charge.success")
      return res.status(200).json({ received: true });

    // Process the successful charge payload (event.data)
    try {
      await finalizePaymentSuccess(event.data);
      const ref = event.data.reference || "unknown";
      console.log(`[WEBHOOK] processed: ${ref}`);
      return res.status(200).json({ received: true });
    } catch (procErr) {
      console.error(
        "[WEBHOOK PROCESS ERROR]",
        procErr?.stack || procErr?.message || procErr,
      );
      // still acknowledge receipt so Paystack doesn't retry repeatedly; processing can be retried via verify endpoint
      return res
        .status(200)
        .json({ received: true, warning: "Processing error" });
    }
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error?.stack || error?.message || error);
    return res
      .status(200)
      .json({ received: true, warning: "Processed with error" });
  }
};

// ── VERIFY PAYMENT (frontend poll after redirect) ─────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const userId = req.user.user_id;
  const role = req.user.role;

  if (!reference)
    return res.status(400).json({ error: "Reference is required." });

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
    [reference],
  );

  if (dbResult.rows.length > 0) {
    const payment = dbResult.rows[0];

    if (
      payment.tenant_id !== userId &&
      payment.landlord_id !== userId &&
      role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this payment." });
    }

    if (payment.payment_status === "success") {
      return res
        .status(200)
        .json({ message: "Payment retrieved successfully", data: payment });
    }
  }

  // Fallback: poll Paystack directly and finalise if successful.
  try {
    const paystackData = await verifyTransaction(reference);
    if (paystackData.status === "success") {
      await finalizePaymentSuccess(paystackData);

      const finalResult = await db.query(
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
        [reference],
      );

      if (finalResult.rows.length > 0) {
        return res
          .status(200)
          .json({
            message: "Payment confirmed successfully",
            data: finalResult.rows[0],
          });
      }

      return res.status(200).json({
        message: "Payment confirmed by Paystack. Finalising receipt...",
        data: { payment_status: "success", paystack_ref: reference },
      });
    }
    return res.status(200).json({
      message: paystackData.gateway_response || paystackData.status,
      data: { payment_status: paystackData.status, paystack_ref: reference },
    });
  } catch {
    return res.status(404).json({
      error: "Payment not found. Contact support if you were charged.",
    });
  }
});

// ── PAYMENT HISTORY ───────────────────────────────────────────────────────────
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const role = req.user.role;
  const user_id = req.user.user_id;

  const isTenant = role === "tenant";
  const whereClause = isTenant
    ? "WHERE p.tenant_id = $1"
    : "WHERE p.landlord_id = $1";

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
      [user_id, limit, offset],
    ),
  ]);

  return res.status(200).json({
    message: "Payment history retrieved successfully",
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
    [reference, userId, userId],
  );

  if (result.rows.length === 0)
    return res.status(404).json({ error: "Receipt not found" });
  return res
    .status(200)
    .json({ message: "Receipt retrieved successfully", data: result.rows[0] });
});

module.exports = {
  getPaymentMetadata,
  getBankList,
  resolveAccount,
  createLandlordSubaccount,
  getLandlordBankDetails,
  getCheckoutInfo,
  initiatePayment,
  paystackWebhook,
  verifyPayment,
  getPaymentHistory,
  getReceipt,
};
