// controllers/announcement.controller.js
const pool = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendAnnouncementEmail } = require('../utils/email');
const { sendPushNotification } = require('../utils/push');

const createAnnouncement = asyncHandler(async (req, res) => {
  const { property_id, title, message_body } = req.body;
  const landlord_id = req.user.user_id;

  if (!property_id || !title || !message_body) {
    return res.status(400).json({ error: 'Property ID, title, and message body are required' });
  }

  const propertiesResult = await pool.query(
    'SELECT property_id FROM properties WHERE property_id = $1 AND landlord_id = $2',
    [property_id, landlord_id]
  );

  if (propertiesResult.rows.length === 0) {
    return res.status(404).json({ error: 'Property not found' });
  }

  const result = await pool.query(
    'INSERT INTO announcements (landlord_id, property_id, title, message_body) VALUES ($1, $2, $3, $4) RETURNING announcement_id',
    [landlord_id, property_id, title, message_body]
  );

  const announcement_id = result.rows[0].announcement_id;

  const tenantsResult = await pool.query(
    `SELECT DISTINCT u.user_id, u.email, u.full_name FROM users u
     JOIN leases l ON u.user_id = l.tenant_id
     JOIN rooms r ON l.room_id = r.room_id
     WHERE r.property_id = $1 AND l.lease_status = 'active'`,
    [property_id]
  );

  const tenants = tenantsResult.rows;
  const frontendUrl = (process.env.FRONTEND_URL || 'https://pro-tech-one.vercel.app').replace(/\/+$/, '');

  tenants.forEach((tenant) => {
    sendAnnouncementEmail(tenant.email, tenant.full_name, title, message_body)
      .catch((emailError) => console.error(`Error sending email for tenant ${tenant.user_id}:`, emailError.message));

    sendPushNotification(
      tenant.user_id,
      'New Announcement',
      title,
      `${frontendUrl}/announcements`
    ).catch((pushError) => console.error(`Error sending push for tenant ${tenant.user_id}:`, pushError.message));
  });

  return res.status(201).json({
    message: 'Announcement created and sent',
    data: { announcement_id, tenants_reached: tenants.length },
  });
});

const getAnnouncements = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  let countText;
  let queryText;
  let params;

  if (req.user.role === 'tenant') {
    countText = `
      SELECT COUNT(*) FROM announcements a
      WHERE a.property_id IN (
        SELECT r.property_id FROM rooms r
        JOIN leases l ON r.room_id = l.room_id
        WHERE l.tenant_id = $1 AND l.lease_status = 'active'
      )`;
    queryText = `
      SELECT a.announcement_id, a.landlord_id, a.property_id,
             a.title, a.message_body,
             TO_CHAR(a.created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
             p.property_name
      FROM announcements a
      JOIN properties p ON a.property_id = p.property_id
      WHERE a.property_id IN (
        SELECT r.property_id FROM rooms r
        JOIN leases l ON r.room_id = l.room_id
        WHERE l.tenant_id = $1 AND l.lease_status = 'active'
      )
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3`;
    params = [req.user.user_id, limit, offset];
  } else {
    countText = `SELECT COUNT(*) FROM announcements WHERE landlord_id = $1`;
    queryText = `
      SELECT a.announcement_id, a.landlord_id, a.property_id,
             a.title, a.message_body,
             TO_CHAR(a.created_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS created_at,
             p.property_name
      FROM announcements a
      JOIN properties p ON a.property_id = p.property_id
      WHERE a.landlord_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3`;
    params = [req.user.user_id, limit, offset];
  }

  const [countResult, result] = await Promise.all([
    pool.query(countText, [req.user.user_id]),
    pool.query(queryText, params),
  ]);

  return res.status(200).json({
    message: 'Announcements retrieved successfully',
    data:    result.rows,
    meta: { total: parseInt(countResult.rows[0].count, 10), page, limit },
  });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const landlord_id = req.user.user_id;

  const checkResult = await pool.query(
    'SELECT announcement_id FROM announcements WHERE announcement_id = $1 AND landlord_id = $2',
    [id, landlord_id]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({ error: 'Announcement not found' });
  }

  await pool.query('DELETE FROM announcements WHERE announcement_id = $1', [id]);

  return res.status(200).json({ message: 'Announcement deleted successfully' });
});

module.exports = {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
};
