// controllers/lease.controller.js
const pool = require('../config/db');

const createLease = async (req, res, next) => {
  try {
    const { tenant_id, room_id, start_date, end_date, rent_amount, due_day } = req.body;
    const landlord_id = req.user.user_id;

    if (!tenant_id || !room_id || !start_date || !end_date || !rent_amount) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Verify room belongs to landlord's property
    const roomsResult = await pool.query(
      'SELECT r.room_id, r.is_occupied, p.landlord_id FROM rooms r JOIN properties p ON r.property_id = p.property_id WHERE r.room_id = $1',
      [room_id]
    );

    if (roomsResult.rows.length === 0 || roomsResult.rows[0].landlord_id !== landlord_id) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Create lease
    const result = await pool.query(
      'INSERT INTO leases (tenant_id, room_id, landlord_id, start_date, end_date, rent_amount, due_day) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING lease_id',
      [tenant_id, room_id, landlord_id, start_date, end_date, rent_amount, due_day || 5]
    );

    // Update room occupancy
    await pool.query('UPDATE rooms SET is_occupied = 1 WHERE room_id = $1', [room_id]);

    return res.status(201).json({
      message: 'Lease created successfully',
      data: {
        lease_id: result.rows[0].lease_id,
        tenant_id,
        room_id,
        start_date,
        end_date,
        rent_amount,
        due_day: due_day || 5,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLeasesByLandlord = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [countResult, result] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM leases WHERE landlord_id = $1', [landlord_id]),
      pool.query(
        `SELECT l.lease_id, l.tenant_id, l.room_id, l.landlord_id,
                l.start_date, l.end_date, l.rent_amount, l.due_day,
                l.lease_status, l.created_at,
                u.full_name AS tenant_name, u.email AS tenant_email,
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
      meta: { total: parseInt(countResult.rows[0].count), page, limit },
    });
  } catch (error) {
    next(error);
  }
};

const getLeasesByTenant = async (req, res, next) => {
  try {
    const tenant_id = req.user.user_id;
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [countResult, result] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM leases WHERE tenant_id = $1', [tenant_id]),
      pool.query(
        `SELECT l.lease_id, l.tenant_id, l.room_id, l.landlord_id,
                l.start_date, l.end_date, l.rent_amount, l.due_day,
                l.lease_status, l.created_at,
                u.full_name    AS landlord_name,
                u.email        AS landlord_email,
                r.room_number, r.monthly_rent,
                p.property_name
         FROM leases l
         JOIN users u      ON l.landlord_id = u.user_id
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
      meta: { total: parseInt(countResult.rows[0].count), page, limit },
    });
  } catch (error) {
    next(error);
  }
};

const getLeaseById = async (req, res, next) => {
  try {
    const { lease_id } = req.params;

    const result = await pool.query(
      `SELECT l.lease_id, l.tenant_id, l.room_id, l.landlord_id, l.start_date, l.end_date, l.rent_amount, l.due_day, l.lease_status, l.created_at, u.full_name as landlord_name, u.email as landlord_email, t.full_name as tenant_name, t.email as tenant_email, r.room_number, p.property_name
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
  } catch (error) {
    next(error);
  }
};

const updateLease = async (req, res, next) => {
  try {
    const { lease_id } = req.params;
    const { start_date, end_date, rent_amount, due_day, lease_status } = req.body;

    const leaseResult = await pool.query('SELECT lease_id, landlord_id, room_id, start_date, end_date, rent_amount, due_day, lease_status FROM leases WHERE lease_id = $1', [lease_id]);

    if (leaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseResult.rows[0];
    if (lease.landlord_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      'UPDATE leases SET start_date = $1, end_date = $2, rent_amount = $3, due_day = $4, lease_status = $5 WHERE lease_id = $6',
      [
        start_date || lease.start_date,
        end_date || lease.end_date,
        rent_amount || lease.rent_amount,
        due_day || lease.due_day,
        lease_status || lease.lease_status,
        lease_id,
      ]
    );

    return res.status(200).json({
      message: 'Lease updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const terminateLease = async (req, res, next) => {
  try {
    const { lease_id } = req.params;

    const leaseResult = await pool.query('SELECT lease_id, landlord_id, room_id, lease_status FROM leases WHERE lease_id = $1', [lease_id]);

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

    // Update room occupancy
    await pool.query('UPDATE rooms SET is_occupied = 0 WHERE room_id = $1', [lease.room_id]);

    return res.status(200).json({
      message: 'Lease terminated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET overdue leases for the authenticated landlord (Issue 1C) ──────────────
// Route: GET /api/lease/overdue
// Auth:  verifyToken + requireRole('landlord')
// Returns all active leases where due date has passed AND rent is not fully paid
const getOverdueLeases = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    // Calculate overdue based on due_day vs today's date in Africa/Lagos
    const result = await pool.query(
      `SELECT
         l.lease_id,
         l.tenant_id,
         l.room_id,
         l.rent_amount,
         l.due_day,
         COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
         (l.rent_amount - COALESCE(l.amount_paid_this_cycle, 0)) AS balance_due,
         u.full_name  AS tenant_name,
         u.username   AS tenant_username,
         u.email      AS tenant_email,
         r.room_number,
         p.property_name,
         -- Days overdue: how many days past the due_day this month
         (EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Africa/Lagos'))::INTEGER - l.due_day::INTEGER) AS days_overdue
       FROM leases l
       JOIN users u      ON l.tenant_id   = u.user_id
       JOIN rooms r      ON l.room_id     = r.room_id
       JOIN properties p ON r.property_id = p.property_id
       WHERE l.landlord_id = $1
         AND l.lease_status = 'active'
         AND l.due_day < EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Africa/Lagos'))::INTEGER
         AND COALESCE(l.amount_paid_this_cycle, 0) < l.rent_amount
         AND u.deleted_at IS NULL
       ORDER BY days_overdue DESC`,
      [landlord_id]
    );

    return res.status(200).json({
      message: 'Overdue leases retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLease,
  getLeasesByLandlord,
  getLeasesByTenant,
  getLeaseById,
  updateLease,
  terminateLease,
  getOverdueLeases,
};
