// controllers/landlord.controller.js
// Handles soft-delete operations for tenants under a landlord's management
const db = require('../config/db');

// ── SOFT DELETE a tenant (Issue 1D) ───────────────────────────────────────────
// Route: DELETE /api/tenants/:tenant_id
// Auth:  verifyToken + requireRole('landlord')
const softDeleteTenant = async (req, res, next) => {
  try {
    const { tenant_id } = req.params;
    const landlord_id = req.user.user_id;
    const { reason } = req.body;

    // Verify this tenant belongs to the requesting landlord via tenant_approvals
    const approvalResult = await db.query(
      `SELECT approval_id FROM tenant_approvals
       WHERE tenant_id = $1
         AND landlord_id = $2
         AND status = 'approved'`,
      [tenant_id, landlord_id]
    );

    if (approvalResult.rows.length === 0) {
      return res.status(403).json({
        error: 'You do not have permission to remove this tenant.',
      });
    }

    // Check tenant exists and is not already deleted
    const tenantResult = await db.query(
      'SELECT user_id, deleted_at FROM users WHERE user_id = $1 AND role = $2',
      [tenant_id, 'tenant']
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    if (tenantResult.rows[0].deleted_at) {
      return res.status(400).json({ error: 'Tenant is already removed.' });
    }

    // Soft delete the tenant
    await db.query(
      `UPDATE users
       SET deleted_at = NOW(),
           deletion_reason = $2
       WHERE user_id = $1`,
      [tenant_id, reason || null]
    );

    // Deactivate their active lease
    await db.query(
      `UPDATE leases
       SET lease_status = 'terminated'
       WHERE tenant_id = $1
         AND landlord_id = $2
         AND lease_status = 'active'`,
      [tenant_id, landlord_id]
    );

    return res.status(200).json({
      message: 'Tenant removed. Recovery available for 30 days.',
    });
  } catch (error) {
    next(error);
  }
};

// ── RESTORE a soft-deleted tenant (Issue 1D) ──────────────────────────────────
// Route: POST /api/tenants/:tenant_id/restore
// Auth:  verifyToken + requireRole('landlord')
const restoreTenant = async (req, res, next) => {
  try {
    const { tenant_id } = req.params;
    const landlord_id = req.user.user_id;

    // Verify this tenant belongs to the requesting landlord
    const approvalResult = await db.query(
      `SELECT approval_id FROM tenant_approvals
       WHERE tenant_id = $1
         AND landlord_id = $2
         AND status = 'approved'`,
      [tenant_id, landlord_id]
    );

    if (approvalResult.rows.length === 0) {
      return res.status(403).json({
        error: 'You do not have permission to restore this tenant.',
      });
    }

    const tenantResult = await db.query(
      'SELECT user_id, deleted_at FROM users WHERE user_id = $1 AND deleted_at IS NOT NULL',
      [tenant_id]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deleted tenant not found.' });
    }

    // Check 30-day window
    const deletedAt = new Date(tenantResult.rows[0].deleted_at);
    const daysSinceDelete = (Date.now() - deletedAt.getTime()) / 86400000;

    if (daysSinceDelete >= 30) {
      return res.status(400).json({
        error: 'Recovery window has expired. This tenant account has been permanently deleted.',
      });
    }

    // Restore the tenant
    await db.query(
      `UPDATE users
       SET deleted_at = NULL,
           deletion_reason = NULL
       WHERE user_id = $1`,
      [tenant_id]
    );

    // Restore their most recent lease for this landlord
    await db.query(
      `UPDATE leases
       SET lease_status = 'active'
       WHERE tenant_id = $1
         AND landlord_id = $2
         AND lease_status = 'terminated'
         AND lease_id = (
           SELECT lease_id FROM leases
           WHERE tenant_id = $1
             AND landlord_id = $2
             AND lease_status = 'terminated'
           ORDER BY created_at DESC
           LIMIT 1
         )`,
      [tenant_id, landlord_id]
    );

    return res.status(200).json({
      message: 'Tenant account restored successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET soft-deleted tenants for this landlord (Issue 1D — Recycle Bin) ───────
// Route: GET /api/tenants/deleted
// Auth:  verifyToken + requireRole('landlord')
const getDeletedTenants = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    const result = await db.query(
      `SELECT
         u.user_id, u.full_name, u.username, u.email,
         u.deleted_at, u.deletion_reason,
         EXTRACT(DAY FROM (NOW() - u.deleted_at))::INTEGER AS days_since_deletion,
         (30 - EXTRACT(DAY FROM (NOW() - u.deleted_at))::INTEGER) AS days_remaining,
         r.room_number,
         p.property_name
       FROM users u
       JOIN tenant_approvals ta ON ta.tenant_id = u.user_id
       LEFT JOIN leases l       ON l.tenant_id = u.user_id AND l.landlord_id = $1
       LEFT JOIN rooms r        ON r.room_id = l.room_id
       LEFT JOIN properties p   ON p.property_id = r.property_id
       WHERE ta.landlord_id = $1
         AND ta.status = 'approved'
         AND u.deleted_at IS NOT NULL
         AND NOW() - u.deleted_at < INTERVAL '30 days'
       ORDER BY u.deleted_at DESC`,
      [landlord_id]
    );

    return res.status(200).json({
      message: 'Deleted tenants retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  softDeleteTenant,
  restoreTenant,
  getDeletedTenants,
};
