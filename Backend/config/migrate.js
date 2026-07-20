// config/migrate.js
// ── Automatic Database Migration Runner ──────────────────────────────────────
// All migrations use IF NOT EXISTS / ON CONFLICT DO NOTHING — they are safe
// to run on every server startup. Existing columns and tables are silently
// skipped; no duplicate creation, no errors, no performance cost.
//
// Execution order:
//   server.js (cold start / listen) → runMigrations() → seedAdmin()
//
// This eliminates the need to manually run SQL in the Neon console.

const db = require('./db');

const runMigrations = async () => {
  console.log('[MIGRATE] Running database migrations...');
  try {

    // ── MIGRATION 1: notification_settings table ──────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        setting_id        SERIAL PRIMARY KEY,
        landlord_id       INTEGER NOT NULL UNIQUE
                          REFERENCES users(user_id)
                          ON DELETE CASCADE,
        remind_30_days    BOOLEAN DEFAULT TRUE,
        remind_14_days    BOOLEAN DEFAULT FALSE,
        remind_7_days     BOOLEAN DEFAULT TRUE,
        remind_3_days     BOOLEAN DEFAULT FALSE,
        remind_1_day      BOOLEAN DEFAULT TRUE,
        remind_on_due     BOOLEAN DEFAULT TRUE,
        send_time         VARCHAR(5)  DEFAULT '08:00',
        frequency_overdue VARCHAR(20) DEFAULT 'daily',
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('[MIGRATE] ✅  notification_settings table ready');

    // Seed defaults for all existing landlords — safe to re-run on every startup
    await db.query(`
      INSERT INTO notification_settings (landlord_id)
      SELECT user_id FROM users WHERE role = 'landlord'
      ON CONFLICT (landlord_id) DO NOTHING
    `);
    console.log('[MIGRATE] ✅  notification_settings seeded for existing landlords');

    // ── MIGRATION 2: notification_type column on notifications table ──────
    await db.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS notification_type
        VARCHAR(30) DEFAULT 'reminder'
    `);
    console.log('[MIGRATE] ✅  notifications.notification_type column ready');

    // ── MIGRATION 3: soft delete columns — users ──────────────────────────
    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS deleted_at
        TIMESTAMPTZ DEFAULT NULL
    `);
    await db.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS deletion_reason
        TEXT DEFAULT NULL
    `);
    console.log('[MIGRATE] ✅  users soft delete columns ready');

    // ── MIGRATION 4: soft delete columns — properties ─────────────────────
    await db.query(`
      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS deleted_at
        TIMESTAMPTZ DEFAULT NULL
    `);
    console.log('[MIGRATE] ✅  properties.deleted_at column ready');

    // ── MIGRATION 5: soft delete columns — rooms ──────────────────────────
    await db.query(`
      ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS deleted_at
        TIMESTAMPTZ DEFAULT NULL
    `);
    console.log('[MIGRATE] ✅  rooms.deleted_at column ready');

    // ── MIGRATION 6: amount_paid_this_cycle on leases (cron engine uses it) ─
    // If this column doesn't exist yet, default 0 so the engine query
    // (COALESCE(l.amount_paid_this_cycle, 0)) never errors.
    await db.query(`
      ALTER TABLE leases
        ADD COLUMN IF NOT EXISTS amount_paid_this_cycle
        NUMERIC(12,2) DEFAULT 0
    `);
    console.log('[MIGRATE] ✅  leases.amount_paid_this_cycle column ready');

    // ── MIGRATION 7: is_active BOOLEAN alias on leases (used by notification engine)
    // The engine spec uses lease_status = 'active'. If is_active doesn't exist,
    // this is a no-op. The engine falls back to lease_status already.
    // (No action needed — engine uses lease_status.)

    console.log('[MIGRATE] ✅  All migrations complete');

  } catch (err) {
    // Log the full error but never crash the server.
    // If a migration fails (e.g. the table doesn't exist yet on a fresh cold
    // deploy), the server still starts and the error appears in Vercel logs.
    console.error('[MIGRATE] ❌  Migration error:', err.message);
  }
};

module.exports = { runMigrations };
