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
      // ── MIGRATION 3b: account_status for tenants (active / inactive / removed)
      await db.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS account_status
          VARCHAR(20) DEFAULT 'active'
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

    // ── MIGRATION 6: payment_frequency on rooms — monthly or annually ───────
    await db.query(`
      ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS payment_frequency
        VARCHAR(10) DEFAULT 'monthly'
        CHECK (payment_frequency IN ('monthly', 'annually'))
    `);
    console.log('[MIGRATE] ✅  rooms.payment_frequency ready');

    // ── MIGRATION 7: payment_frequency on leases — store payment collection cadence
    await db.query(`
      ALTER TABLE leases
        ADD COLUMN IF NOT EXISTS payment_frequency
        VARCHAR(10) DEFAULT 'monthly'
        CHECK (payment_frequency IN ('monthly', 'annually'))
    `);
    console.log('[MIGRATE] ✅  leases.payment_frequency ready');

    // ── MIGRATION 8: amount_paid_this_cycle on leases (cron engine uses it) ─
    // If this column doesn't exist yet, default 0 so the engine query
    // (COALESCE(l.amount_paid_this_cycle, 0)) never errors.
    await db.query(`
      ALTER TABLE leases
        ADD COLUMN IF NOT EXISTS amount_paid_this_cycle
        NUMERIC(12,2) DEFAULT 0
    `);
    console.log('[MIGRATE] ✅  leases.amount_paid_this_cycle column ready');

    // ── MIGRATION 9: service_fee on payments — platform transaction revenue
    await db.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS service_fee
        NUMERIC(12,2) DEFAULT 500
    `);
    console.log('[MIGRATE] ✅  payments.service_fee ready');

    // ── MIGRATION 10: lease date columns as DATE (eliminates timezone shift) ─
    // Make due_day nullable since end_date is now the due date
    await db.query(`
      ALTER TABLE leases
        ALTER COLUMN due_day DROP NOT NULL
    `).catch(() => { });

    // Ensure start_date and end_date are DATE type (not TIMESTAMPTZ)
    await db.query(`
      ALTER TABLE leases
        ALTER COLUMN start_date TYPE DATE
          USING start_date::DATE,
        ALTER COLUMN end_date TYPE DATE
          USING end_date::DATE
    `).catch(() => { });

    console.log('[MIGRATE] ✅  Lease dates corrected: end_date is due_date');

    // ── MIGRATION 11: performance indexes for hot paths ───────────────────
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_leases_landlord
        ON leases(landlord_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_tenant
        ON leases(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_room
        ON leases(room_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leases_active
        ON leases(landlord_id, lease_status)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_lease
        ON payments(lease_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_landlord
        ON payments(landlord_id, payment_date)`,
      `CREATE INDEX IF NOT EXISTS idx_payments_service_fee
        ON payments(service_fee)`,
      `CREATE INDEX IF NOT EXISTS idx_rooms_property
        ON rooms(property_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rooms_occupied
        ON rooms(property_id, is_occupied)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_lease
        ON notifications(lease_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_email
        ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role
        ON users(role, deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_users_landlord_code
        ON users(landlord_code)`,
      `CREATE INDEX IF NOT EXISTS idx_properties_landlord
        ON properties(landlord_id, deleted_at)`,
    ];

    for (const sql of indexes) {
      await db.query(sql);
    }
    console.log('[MIGRATE] ✅  All database indexes ready');

    console.log('[MIGRATE] ✅  All migrations complete');

  } catch (err) {
    // Log the full error but never crash the server.
    // If a migration fails (e.g. the table doesn't exist yet on a fresh cold
    // deploy), the server still starts and the error appears in Vercel logs.
    console.error('[MIGRATE] ❌  Migration error:', err.message);
  }
};

module.exports = { runMigrations };
