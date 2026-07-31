const pool = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const getLandlordDashboard = asyncHandler(async (req, res) => {
  const landlordId = req.user.user_id;

  const result = await pool.query(`
    WITH lease_stats AS (
      SELECT
        l.lease_id,
        l.room_id,
        l.tenant_id,
        l.rent_amount,
        COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
        l.payment_frequency,
        TO_CHAR(l.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(l.end_date,   'YYYY-MM-DD') AS end_date,
        TO_CHAR(l.end_date,   'YYYY-MM-DD') AS due_date,
        CASE
          WHEN (l.end_date AT TIME ZONE 'Africa/Lagos')::DATE
               < (NOW() AT TIME ZONE 'Africa/Lagos')::DATE
            AND COALESCE(l.amount_paid_this_cycle, 0) < l.rent_amount
          THEN TRUE ELSE FALSE
        END AS is_overdue,
        (l.end_date::DATE - (NOW() AT TIME ZONE 'Africa/Lagos')::DATE) AS days_remaining,
        u.full_name   AS tenant_name,
        u.username    AS tenant_username,
        u.email       AS tenant_email,
        r.room_number,
        r.room_type,
        p.property_name
      FROM leases l
      JOIN users u ON l.tenant_id = u.user_id
      JOIN rooms r ON l.room_id = r.room_id
      JOIN properties p ON r.property_id = p.property_id
      WHERE l.landlord_id = $1
        AND l.lease_status = 'active'
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ),
    payment_stats AS (
      SELECT
        COALESCE(SUM(amount_paid)
          FILTER (WHERE
            DATE_TRUNC('month',
              payment_date AT TIME ZONE 'Africa/Lagos')
            = DATE_TRUNC('month',
              NOW() AT TIME ZONE 'Africa/Lagos')
            AND payment_status = 'success'
          ), 0) AS revenue_this_month,
        COALESCE(SUM(amount_paid)
          FILTER (WHERE payment_status = 'success'), 0) AS revenue_all_time
      FROM payments
      WHERE landlord_id = $1
    ),
    property_stats AS (
      SELECT
        COUNT(DISTINCT p.property_id) AS total_properties,
        COUNT(DISTINCT r.room_id)
          FILTER (WHERE r.deleted_at IS NULL
            AND r.is_occupied = 1)    AS occupied_rooms,
        COUNT(DISTINCT r.room_id)
          FILTER (WHERE r.deleted_at IS NULL
            AND r.is_occupied = 0)    AS vacant_rooms
      FROM properties p
      LEFT JOIN rooms r ON r.property_id = p.property_id
      WHERE p.landlord_id = $1
        AND p.deleted_at IS NULL
    )
    SELECT
      ps.*,
      pys.*,
      ls_agg.active_tenants,
      ls_agg.overdue_count,
      ls_agg.recent_leases
    FROM property_stats ps
    CROSS JOIN payment_stats pys
    CROSS JOIN (
      SELECT
        COUNT(DISTINCT tenant_id) AS active_tenants,
        COUNT(DISTINCT tenant_id) FILTER (WHERE is_overdue) AS overdue_count,
        COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'lease_id', lease_id,
            'tenant_id', tenant_id,
            'tenant_name', tenant_name,
            'tenant_username', tenant_username,
            'room_number', room_number,
            'property_name', property_name,
            'rent_amount', rent_amount,
            'amount_paid', amount_paid_this_cycle,
            'remaining', rent_amount - COALESCE(amount_paid_this_cycle, 0),
            'due_date', due_date,
            'is_overdue', is_overdue,
            'start_date', start_date,
            'end_date', end_date
          ) ORDER BY is_overdue DESC, tenant_name ASC
        ), '[]'::json) AS recent_leases
      FROM lease_stats
    ) ls_agg
  `, [landlordId]);

  return res.status(200).json(result.rows[0] || {});
});

module.exports = {
  getLandlordDashboard,
  getLandlordDashboardStats: getLandlordDashboard,
};
