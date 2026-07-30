// controllers/account.controller.js
// PERMANENT account deletion — user-initiated self-service.
// Guards: correct password + typing "DELETE MY ACCOUNT" exactly.
// Uses a Postgres transaction so deletion is all-or-nothing.

const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');
const { clearRefreshCookie } = require('../utils/tokenUtils');

/**
 * DELETE /api/auth/account
 *
 * Body: { password: string, confirm_text: string }
 *
 * confirm_text must equal exactly "DELETE MY ACCOUNT".
 * password is verified against the stored bcrypt hash.
 *
 * On success: all account data removed in one transaction,
 * refresh cookie cleared, 200 returned.
 */
const deleteMyAccount = asyncHandler(async (req, res) => {
  const { password, confirm_text } = req.body;
  const userId = req.user.user_id;
  const role   = req.user.role;

  // ── Guard 1: confirmation phrase ───────────────────────────────────────────
  if (confirm_text !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      error: 'Please type DELETE MY ACCOUNT exactly to confirm.',
    });
  }

  // ── Guard 2: password required ─────────────────────────────────────────────
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  // ── Verify password ─────────────────────────────────────────────────────────
  const userRows = await db.query(
    'SELECT password_hash FROM users WHERE user_id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (userRows.rows.length === 0) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const isMatch = await bcrypt.compare(password, userRows.rows[0].password_hash);
  if (!isMatch) {
    return res.status(400).json({
      error: 'Incorrect password. Please verify your password and try again before deleting your account.',
    });
  }

  // ── Admins cannot self-delete ───────────────────────────────────────────────
  if (role === 'admin') {
    return res.status(403).json({
      error: 'Admin accounts cannot be self-deleted.',
    });
  }

  // ── Permanent deletion in a single transaction ─────────────────────────────
  const pool   = db.pool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (role === 'tenant') {
      // 1. Rent reminder notifications for this tenant
      await client.query(
        'DELETE FROM notifications WHERE tenant_id = $1',
        [userId]
      );
      // 2. Payments made by this tenant
      await client.query(
        'DELETE FROM payments WHERE tenant_id = $1',
        [userId]
      );
      // 3. Approval requests submitted by this tenant
      await client.query(
        'DELETE FROM tenant_approvals WHERE tenant_id = $1',
        [userId]
      );
      // 4. Vacate any rooms this tenant is currently leasing
      await client.query(
        `UPDATE rooms r
           SET is_occupied = 0
         FROM leases l
         WHERE l.room_id   = r.room_id
           AND l.tenant_id = $1`,
        [userId]
      );
      // 5. Delete leases
      await client.query(
        'DELETE FROM leases WHERE tenant_id = $1',
        [userId]
      );
      // 6. Delete the user record
      await client.query(
        'DELETE FROM users WHERE user_id = $1',
        [userId]
      );

    } else if (role === 'landlord') {
      // 1. Notification settings
      await client.query(
        'DELETE FROM notification_settings WHERE landlord_id = $1',
        [userId]
      );
      // 2. Rent reminders for all leases owned by this landlord
      await client.query(
        `DELETE FROM notifications
         WHERE lease_id IN (SELECT lease_id FROM leases WHERE landlord_id = $1)`,
        [userId]
      );
      // 3. Announcements published by this landlord
      await client.query(
        'DELETE FROM announcements WHERE landlord_id = $1',
        [userId]
      );
      // 4. Payments received by this landlord
      await client.query(
        'DELETE FROM payments WHERE landlord_id = $1',
        [userId]
      );
      // 5. Tenant approval records for this landlord
      await client.query(
        'DELETE FROM tenant_approvals WHERE landlord_id = $1',
        [userId]
      );
      // 6. All leases under this landlord
      await client.query(
        'DELETE FROM leases WHERE landlord_id = $1',
        [userId]
      );
      // 7. All rooms in this landlord's properties
      await client.query(
        `DELETE FROM rooms
         WHERE property_id IN (
           SELECT property_id FROM properties WHERE landlord_id = $1
         )`,
        [userId]
      );
      // 8. Properties themselves
      await client.query(
        'DELETE FROM properties WHERE landlord_id = $1',
        [userId]
      );
      // 9. Delete the user record
      await client.query(
        'DELETE FROM users WHERE user_id = $1',
        [userId]
      );
    }

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DELETE ACCOUNT] Transaction rollback:', err.message);
    throw err;
  } finally {
    client.release();
  }

  // Clear session cookie and respond
  clearRefreshCookie(res);

  console.log(`[DELETE ACCOUNT] ✅ ${role} user_id=${userId} permanently deleted`);

  return res.status(200).json({
    message: 'Your account has been permanently deleted.',
  });
});

module.exports = { deleteMyAccount };
