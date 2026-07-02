-- ============================================================
-- 003_performance_indexes.sql
-- Performance indexes for ProTech — run once on Neon.tech
-- All indexes use CONCURRENTLY (no table locks) + IF NOT EXISTS (idempotent)
-- ============================================================

-- ─── users table ─────────────────────────────────────────────
-- Used in: login (WHERE email/username), register (uniqueness checks),
--          landlord code lookup, role filters in admin endpoints
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username
  ON users(username);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role
  ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_landlord_code
  ON users(landlord_code);

-- ─── properties table ────────────────────────────────────────
-- Used in: every property/room/lease query (WHERE landlord_id, JOIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_landlord_id
  ON properties(landlord_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_created_at
  ON properties(created_at DESC);

-- ─── rooms table ─────────────────────────────────────────────
-- Used in: room queries, lease creation/termination, JOIN from leases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_property_id
  ON rooms(property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_is_occupied
  ON rooms(is_occupied);

-- ─── leases table ────────────────────────────────────────────
-- Used in: every dashboard, payment, announcement, notification query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_tenant_id
  ON leases(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_landlord_id
  ON leases(landlord_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_room_id
  ON leases(room_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_status
  ON leases(lease_status);

-- Composite: most common pattern — landlord's active leases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_landlord_status
  ON leases(landlord_id, lease_status);

-- Composite: tenant's active leases (payment eligibility check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_tenant_status
  ON leases(tenant_id, lease_status);

-- ─── payments table ───────────────────────────────────────────
-- Used in: payment history, receipt lookup, webhook dedup check
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_id
  ON payments(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_landlord_id
  ON payments(landlord_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_lease_id
  ON payments(lease_id);

-- Unique-like lookup for webhook deduplication — most critical index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_paystack_ref
  ON payments(paystack_ref);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status
  ON payments(payment_status);

-- Descending on payment_date for ORDER BY payment_date DESC queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_date_desc
  ON payments(payment_date DESC);

-- Composite: tenant's successful payments (dashboard overdue calc)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_status_date
  ON payments(tenant_id, payment_status, payment_date DESC);

-- Composite: landlord's payment history (most common admin/landlord query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_landlord_status_date
  ON payments(landlord_id, payment_status, payment_date DESC);

-- ─── tenant_approvals table ───────────────────────────────────
-- Used in: getPendingApprovals, processApproval, requestApproval
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_approvals_tenant_id
  ON tenant_approvals(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_approvals_landlord_id
  ON tenant_approvals(landlord_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_approvals_status
  ON tenant_approvals(status);

-- Composite: landlord's pending approvals (most common pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_approvals_landlord_status
  ON tenant_approvals(landlord_id, status);

-- ─── notifications table ──────────────────────────────────────
-- Used in: getNotifications for tenant and landlord activity feed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_id
  ON notifications(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_lease_id
  ON notifications(lease_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_sent_at
  ON notifications(sent_at DESC);

-- ─── announcements table ──────────────────────────────────────
-- Used in: getAnnouncements, createAnnouncement, deleteAnnouncement
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_landlord_id
  ON announcements(landlord_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_property_id
  ON announcements(property_id);

-- ─── password_resets table ────────────────────────────────────
-- Used in: resetPassword (WHERE email AND otp_code AND is_used AND expires_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_resets_email
  ON password_resets(email);

-- ============================================================
-- To verify indexes were created:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
-- ============================================================
