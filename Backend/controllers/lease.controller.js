// controllers/lease.controller.js
const pool = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const LEASE_DATE_FIELDS = `
  TO_CHAR(l.start_date, 'YYYY-MM-DD') AS start_date,
  TO_CHAR(l.end_date,   'YYYY-MM-DD') AS end_date,
  TO_CHAR(l.end_date,   'YYYY-MM-DD') AS due_date,
  CASE
    WHEN (l.end_date AT TIME ZONE 'Africa/Lagos')::DATE
         < (NOW() AT TIME ZONE 'Africa/Lagos')::DATE
      AND COALESCE(l.amount_paid_this_cycle, 0) < l.rent_amount
    THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  (l.end_date::DATE - (NOW() AT TIME ZONE 'Africa/Lagos')::DATE) AS days_remaining
`;

const createLease = asyncHandler(async (req, res) => {
  const {
    tenant_id, room_id, start_date, end_date,
    rent_amount, payment_frequency
  } = req.body;
  const landlord_id = req.user.user_id;

  if (!tenant_id || !room_id || !start_date || !end_date || !rent_amount) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  // Validate end_date is after start_date
  if (new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({ error: 'End date must be after start date.' });
  }

  const existingTenantLease = await pool.query(
    `SELECT lease_id
     FROM leases
     WHERE tenant_id = $1
       AND lease_status = 'active'
     LIMIT 1`,
    [tenant_id]
  );

  if (existingTenantLease.rows.length > 0) {
    return res.status(400).json({ error: 'This tenant already has an active room assignment' });
  }

  const roomsResult = await pool.query(
    'SELECT r.room_id, r.is_occupied, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
    [room_id]
  );

  if (roomsResult.rows.length === 0 || roomsResult.rows[0].landlord_id !== landlord_id) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const finalRent = rent_amount || roomsResult.rows[0].monthly_rent

  const result = await pool.query(
    `INSERT INTO leases
      (tenant_id, room_id, landlord_id, start_date, end_date, rent_amount, amount_paid_this_cycle, payment_frequency, lease_status)
     VALUES ($1, $2, $3, $4::DATE, $5::DATE, $6, 0, $7, 'active')
     RETURNING
       lease_id,
       TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
       TO_CHAR(end_date,   'YYYY-MM-DD') AS end_date,
       TO_CHAR(end_date,   'YYYY-MM-DD') AS due_date,
       rent_amount,
       amount_paid_this_cycle,
       payment_frequency`,
    [tenant_id, room_id, landlord_id, start_date, end_date, finalRent, payment_frequency || 'monthly']
  );

  await pool.query('UPDATE rooms SET is_occupied = 1 WHERE room_id = $1', [room_id]);

  return res.status(201).json({
    message: 'Lease created successfully',
    data: {
      lease: result.rows[0]
    },
  });
});

const getMyLease = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
      l.lease_id,
      ${LEASE_DATE_FIELDS},
      l.rent_amount,
      COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
      l.payment_frequency,
      r.room_number,
      r.room_type,
      r.monthly_rent,
      p.property_name,
      p.address AS property_address,
      u_landlord.full_name AS landlord_name,
      u_landlord.phone_number AS landlord_phone,
      u_landlord.hostel_name
    FROM leases l
    JOIN rooms r ON l.room_id = r.room_id
    JOIN properties p ON r.property_id = p.property_id
    JOIN users u_landlord ON l.landlord_id = u_landlord.user_id
    WHERE l.tenant_id = $1
      AND l.lease_status = 'active'
    LIMIT 1`,
    [req.user.user_id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: 'No active lease found.',
    });
  }

  return res.status(200).json(result.rows[0]);
});

const getLeasesByLandlord = asyncHandler(async (req, res) => {
  const landlord_id = req.user.user_id;
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const [countResult, result] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM leases WHERE landlord_id = $1', [landlord_id]),
    pool.query(
      `SELECT l.lease_id, l.tenant_id, l.room_id, l.landlord_id,
                ${LEASE_DATE_FIELDS},
                l.rent_amount, COALESCE(l.amount_paid_this_cycle,0) AS amount_paid_this_cycle,
                l.lease_status,
                TO_CHAR(l.created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
                u.full_name AS tenant_name, u.username AS tenant_username, u.email AS tenant_email,
                r.room_number,
                p.property_name
         FROM leases l
         JOIN users u      ON l.tenant_id   = u.user_id
         JOIN rooms r      ON l.room_id     = r.room_id
         JOIN properties p ON r.property_id = p.property_id
         WHERE l.landlord_id = $1
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`,
        [landlord_id, limit, offset]
    ),
  ]);

  return res.status(200).json({
    message: 'Leases retrieved successfully',
    data:    result.rows,
    meta: { total: parseInt(countResult.rows[0].count, 10), page, limit },
  });
});

const getLeasesByTenant = asyncHandler(async (req, res) => {
  const tenant_id = req.user.user_id;
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const [countResult, result] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM leases WHERE tenant_id = $1', [tenant_id]),
    pool.query(
      `SELECT l.lease_id, l.tenant_id, l.room_id, l.landlord_id,
                ${LEASE_DATE_FIELDS},
                l.rent_amount, COALESCE(l.amount_paid_this_cycle,0) AS amount_paid_this_cycle,
                l.lease_status,
                TO_CHAR(l.created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
                u.full_name    AS landlord_name,
                u.email        AS landlord_email,
                t.username     AS tenant_username,
                r.room_number, r.monthly_rent AS yearly_rent, r.room_type, r.payment_frequency,
                p.property_name, p.address AS property_address
         FROM leases l
         JOIN users u      ON l.landlord_id = u.user_id
         JOIN users t      ON l.tenant_id   = t.user_id
         JOIN rooms r      ON l.room_id     = r.room_id
         JOIN properties p ON r.property_id = p.property_id
         WHERE l.tenant_id = $1
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`,
        [tenant_id, limit, offset]
    ),
  ]);

  return res.status(200).json({
    message: 'Leases retrieved successfully',
    data:    result.rows,
    meta: { total: parseInt(countResult.rows[0].count, 10), page, limit },
  });
});

const getLeaseById = asyncHandler(async (req, res) => {
  const { lease_id } = req.params;

  const result = await pool.query(
        `SELECT l.lease_id, l.tenant_id, l.room_id, l.landlord_id,
          ${LEASE_DATE_FIELDS},
          l.rent_amount, COALESCE(l.amount_paid_this_cycle,0) AS amount_paid_this_cycle,
          l.lease_status,
          TO_CHAR(l.created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
          u.full_name as landlord_name, u.email as landlord_email,
          t.full_name as tenant_name, t.username as tenant_username, t.email as tenant_email,
          r.room_number, r.monthly_rent AS yearly_rent, r.room_type, r.payment_frequency,
          p.property_name, p.address AS property_address
         FROM leases l
         JOIN users u ON l.landlord_id = u.user_id
         JOIN users t ON l.tenant_id = t.user_id
         JOIN rooms r ON l.room_id = r.room_id
         JOIN properties p ON r.property_id = p.property_id
         WHERE l.lease_id = $1`,
        [lease_id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Lease not found' });
  }

  const lease = result.rows[0];
  if (lease.landlord_id !== req.user.user_id && lease.tenant_id !== req.user.user_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  return res.status(200).json({
    message: 'Lease retrieved successfully',
    data: lease,
  });
});

const updateLease = asyncHandler(async (req, res) => {
  const { lease_id } = req.params;
  const { start_date, end_date, rent_amount, lease_status } = req.body;

  const leaseResult = await pool.query(
    `SELECT lease_id, landlord_id, room_id,
            start_date, end_date, rent_amount, lease_status
     FROM leases WHERE lease_id = $1`,
    [lease_id]
  );

  if (leaseResult.rows.length === 0) {
    return res.status(404).json({ error: 'Lease not found' });
  }

  const lease = leaseResult.rows[0];
  if (lease.landlord_id !== req.user.user_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await pool.query(
    `UPDATE leases
     SET start_date = COALESCE($1::DATE, start_date),
         end_date   = COALESCE($2::DATE, end_date),
         rent_amount = COALESCE($3, rent_amount),
         payment_frequency = COALESCE($4, payment_frequency),
         lease_status = COALESCE($5, lease_status)
     WHERE lease_id = $6`,
    [start_date, end_date, rent_amount, req.body.payment_frequency, lease_status, lease_id]
  );

  return res.status(200).json({
    message: 'Lease updated successfully',
  });
});

const terminateLease = asyncHandler(async (req, res) => {
  const { lease_id } = req.params;

  const leaseResult = await pool.query(
    'SELECT lease_id, landlord_id, room_id, lease_status FROM leases WHERE lease_id = $1',
    [lease_id]
  );

  if (leaseResult.rows.length === 0) {
    return res.status(404).json({ error: 'Lease not found' });
  }

  const lease = leaseResult.rows[0];
  if (lease.landlord_id !== req.user.user_id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await pool.query('UPDATE leases SET lease_status = $1 WHERE lease_id = $2', [
    'terminated',
    lease_id,
  ]);

  await pool.query('UPDATE rooms SET is_occupied = 0 WHERE room_id = $1', [lease.room_id]);

  return res.status(200).json({
    message: 'Lease terminated successfully',
  });
});

const getOverdueLeases = asyncHandler(async (req, res) => {
  const landlord_id = req.user.user_id;

  const result = await pool.query(
    `SELECT
       l.lease_id,
       l.tenant_id,
       l.room_id,
       l.rent_amount,
       COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
       (l.rent_amount - COALESCE(l.amount_paid_this_cycle, 0)) AS balance_due,
       TO_CHAR(l.end_date, 'YYYY-MM-DD') AS end_date,
       TO_CHAR(l.end_date, 'YYYY-MM-DD') AS due_date,
       (l.end_date::DATE - (NOW() AT TIME ZONE 'Africa/Lagos')::DATE) AS days_remaining,
       u.full_name  AS tenant_name,
       u.username   AS tenant_username,
       u.email      AS tenant_email,
       r.room_number,
       p.property_name
     FROM leases l
     JOIN users u      ON l.tenant_id   = u.user_id
     JOIN rooms r      ON l.room_id     = r.room_id
     JOIN properties p ON r.property_id = p.property_id
     WHERE l.landlord_id = $1
       AND l.lease_status = 'active'
       AND l.end_date::DATE < (NOW() AT TIME ZONE 'Africa/Lagos')::DATE
       AND COALESCE(l.amount_paid_this_cycle, 0) < l.rent_amount
       AND u.deleted_at IS NULL
     ORDER BY days_remaining ASC`,
    [landlord_id]
  );

  return res.status(200).json({
    message: 'Overdue leases retrieved successfully',
    data: result.rows,
  });
});

module.exports = {
  createLease,
  getMyLease,
  getLeasesByLandlord,
  getLeasesByTenant,
  getLeaseById,
  updateLease,
  terminateLease,
  getOverdueLeases,
};
