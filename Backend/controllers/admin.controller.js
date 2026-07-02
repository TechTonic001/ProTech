// controllers/admin.controller.js
const pool = require('../config/db');

// Helper: parse pagination query params with sane defaults
const parsePagination = (query, defaultLimit = 20) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getStats = async (req, res, next) => {
  try {
    // Run all four COUNT/SUM queries in parallel — no sequential dependency
    const [landlords, tenants, properties, payments] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'landlord'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'tenant'"),
      pool.query("SELECT COUNT(*) FROM properties"),
      pool.query("SELECT SUM(amount_paid) AS total_revenue FROM payments WHERE payment_status = 'success'"),
    ]);

    return res.status(200).json({
      message: 'Admin stats retrieved successfully',
      data: {
        total_landlords: parseInt(landlords.rows[0].count)  || 0,
        total_tenants:   parseInt(tenants.rows[0].count)    || 0,
        total_properties: parseInt(properties.rows[0].count) || 0,
        total_revenue:   parseFloat(payments.rows[0].total_revenue) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLandlords = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [countResult, result] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'landlord'"),
      pool.query(
        `SELECT user_id, username, full_name, email, phone_number,
                is_approved, hostel_name, hostel_address, created_at
         FROM users
         WHERE role = 'landlord'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    return res.status(200).json({
      message: 'Landlords retrieved successfully',
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

const getTenants = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [countResult, result] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'tenant'"),
      pool.query(
        `SELECT u.user_id, u.username, u.full_name, u.email,
                u.phone_number, u.is_approved, u.created_at,
                l.lease_id, r.room_number, pr.property_name
         FROM users u
         LEFT JOIN leases l  ON u.user_id = l.tenant_id AND l.lease_status = 'active'
         LEFT JOIN rooms r   ON l.room_id = r.room_id
         LEFT JOIN properties pr ON r.property_id = pr.property_id
         WHERE u.role = 'tenant'
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    return res.status(200).json({
      message: 'Tenants retrieved successfully',
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

const getPayments = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [countResult, result] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM payments'),
      pool.query(
        `SELECT
           p.payment_id, p.lease_id, p.tenant_id, p.landlord_id,
           p.amount_paid, p.paystack_ref, p.subaccount_code,
           p.payment_status, p.receipt_number, p.payment_date,
           u_tenant.full_name   AS tenant_name,
           u_tenant.username    AS tenant_username,
           u_landlord.hostel_name,
           r.room_number,
           pr.property_name
         FROM payments p
         JOIN users u_tenant   ON p.tenant_id   = u_tenant.user_id
         JOIN users u_landlord ON p.landlord_id  = u_landlord.user_id
         LEFT JOIN leases l    ON p.lease_id     = l.lease_id
         LEFT JOIN rooms r     ON l.room_id      = r.room_id
         LEFT JOIN properties pr ON r.property_id = pr.property_id
         ORDER BY p.payment_date DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    return res.status(200).json({
      message: 'Payments retrieved successfully',
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

const getProperties = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [countResult, result] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM properties'),
      pool.query(
        `SELECT pr.property_id, pr.landlord_id, pr.property_name,
                pr.address, pr.city, pr.total_rooms, pr.created_at,
                u.full_name  AS landlord_name,
                u.username   AS landlord_username
         FROM properties pr
         JOIN users u ON pr.landlord_id = u.user_id
         ORDER BY pr.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    return res.status(200).json({
      message: 'Properties retrieved successfully',
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

module.exports = {
  getStats,
  getLandlords,
  getTenants,
  getPayments,
  getProperties,
};
