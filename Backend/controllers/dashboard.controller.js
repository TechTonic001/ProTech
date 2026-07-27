const pool = require('../config/db');

const getLandlordDashboardStats = async (req, res, next) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT p.property_id)  AS total_properties,
        COUNT(DISTINCT r.room_id)
          FILTER (WHERE r.is_occupied = 1
            AND r.deleted_at IS NULL)   AS occupied_rooms,
        COUNT(DISTINCT r.room_id)
          FILTER (WHERE r.is_occupied = 0
            AND r.deleted_at IS NULL)   AS vacant_rooms,
        COUNT(DISTINCT l.lease_id)
          FILTER (WHERE l.lease_status = 'active') AS active_tenants,
        COALESCE(SUM(pay.amount_paid)
          FILTER (WHERE
            DATE_TRUNC('month', pay.payment_date)
            = DATE_TRUNC('month', NOW())), 0)
                                        AS revenue_this_month,
        COUNT(DISTINCT l.lease_id)
          FILTER (WHERE l.lease_status = 'active'
            AND l.amount_paid_this_cycle < l.rent_amount
            AND EXTRACT(DAY FROM NOW()) > l.due_day)
                                        AS overdue_count
      FROM properties p
      LEFT JOIN rooms r ON r.property_id = p.property_id
      LEFT JOIN leases l ON l.room_id = r.room_id
      LEFT JOIN payments pay ON pay.lease_id = l.lease_id
      WHERE p.landlord_id = $1
        AND p.deleted_at IS NULL
    `, [req.user.user_id]);

    return res.status(200).json(statsResult.rows[0] || {});
  } catch (err) {
    console.error('[DASHBOARD ERROR]', err.message);
    return res.status(500).json({ error: 'Failed to load dashboard stats.' });
  }
};

module.exports = {
  getLandlordDashboardStats,
};