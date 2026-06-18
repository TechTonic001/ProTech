// controllers/admin.controller.js
const pool = require('../config/db');

const getStats = async (req, res, next) => {
  try {
    const landlordCountResult = pool.query("SELECT COUNT(*) FROM users WHERE role = 'landlord'");
    const tenantCountResult = pool.query("SELECT COUNT(*) FROM users WHERE role = 'tenant'");
    const propertiesCountResult = pool.query("SELECT COUNT(*) FROM properties");
    const paymentsSumResult = pool.query("SELECT SUM(amount_paid) AS total_revenue FROM payments WHERE payment_status = 'success'");

    const [landlords, tenants, properties, payments] = await Promise.all([
      landlordCountResult,
      tenantCountResult,
      propertiesCountResult,
      paymentsSumResult
    ]);

    return res.status(200).json({
      message: 'Admin stats retrieved successfully',
      data: {
        total_landlords: parseInt(landlords.rows[0].count) || 0,
        total_tenants: parseInt(tenants.rows[0].count) || 0,
        total_properties: parseInt(properties.rows[0].count) || 0,
        total_revenue: parseFloat(payments.rows[0].total_revenue) || 0,
      }
    });
  } catch (error) {
    next(error);
  }
};

const getLandlords = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT user_id, username, full_name, email, phone_number, is_approved, hostel_name, hostel_address, created_at FROM users WHERE role = 'landlord' ORDER BY created_at DESC"
    );
    return res.status(200).json({
      message: 'Landlords retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const getTenants = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.full_name, u.email, u.phone_number, u.is_approved, u.created_at,
              l.lease_id, r.room_number, pr.property_name
       FROM users u
       LEFT JOIN leases l ON u.user_id = l.tenant_id AND l.lease_status = 'active'
       LEFT JOIN rooms r ON l.room_id = r.room_id
       LEFT JOIN properties pr ON r.property_id = pr.property_id
       WHERE u.role = 'tenant'
       ORDER BY u.created_at DESC`
    );
    return res.status(200).json({
      message: 'Tenants retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
              u_tenant.full_name AS tenant_name, 
              u_tenant.username AS tenant_username,
              u_landlord.hostel_name,
              r.room_number,
              pr.property_name
       FROM payments p
       JOIN users u_tenant ON p.tenant_id = u_tenant.user_id
       JOIN users u_landlord ON p.landlord_id = u_landlord.user_id
       LEFT JOIN leases l ON p.lease_id = l.lease_id
       LEFT JOIN rooms r ON l.room_id = r.room_id
       LEFT JOIN properties pr ON r.property_id = pr.property_id
       ORDER BY p.payment_date DESC`
    );
    return res.status(200).json({
      message: 'Payments retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

const getProperties = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, u.full_name as landlord_name, u.username as landlord_username
       FROM properties pr
       JOIN users u ON pr.landlord_id = u.user_id
       ORDER BY pr.created_at DESC`
    );
    return res.status(200).json({
      message: 'Properties retrieved successfully',
      data: result.rows
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
  getProperties
};
