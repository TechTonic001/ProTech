// controllers/announcement.controller.js
const pool = require('../config/db');
const { sendAnnouncementEmail } = require('../utils/email');
const { sendPushNotification } = require('../utils/push');

const createAnnouncement = async (req, res, next) => {
  try {
    const { property_id, title, message_body } = req.body;
    const landlord_id = req.user.user_id;

    if (!property_id || !title || !message_body) {
      return res.status(400).json({ error: 'Property ID, title, and message body are required' });
    }

    // Verify property belongs to landlord
    const propertiesResult = await pool.query(
      'SELECT * FROM properties WHERE property_id = $1 AND landlord_id = $2',
      [property_id, landlord_id]
    );

    if (propertiesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Create announcement
    const result = await pool.query(
      'INSERT INTO announcements (landlord_id, property_id, title, message_body) VALUES ($1, $2, $3, $4) RETURNING announcement_id',
      [landlord_id, property_id, title, message_body]
    );

    const announcement_id = result.rows[0].announcement_id;

    // Get all active tenants for this property
    const tenantsResult = await pool.query(
      `SELECT DISTINCT u.user_id, u.email, u.full_name FROM users u
       JOIN leases l ON u.user_id = l.tenant_id
       JOIN rooms r ON l.room_id = r.room_id
       WHERE r.property_id = $1 AND l.lease_status = 'active'`,
      [property_id]
    );

    const tenants = tenantsResult.rows;

    // Send email and push notifications
    let tenants_reached = 0;
    for (const tenant of tenants) {
      try {
        await sendAnnouncementEmail(tenant.email, tenant.full_name, title, message_body);
        await sendPushNotification(
          tenant.user_id,
          'New Announcement',
          title,
          `${process.env.FRONTEND_URL}/announcements`
        );
        tenants_reached++;
      } catch (error) {
        console.error(`Error notifying tenant ${tenant.user_id}:`, error.message);
      }
    }

    return res.status(201).json({
      message: 'Announcement created and sent',
      data: {
        announcement_id,
        tenants_reached,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAnnouncements = async (req, res, next) => {
  try {
    let queryText, params;

    if (req.user.role === 'tenant') {
      // Get announcements for tenant's active leases
      queryText = `SELECT a.*, p.property_name FROM announcements a
               JOIN properties p ON a.property_id = p.property_id
               WHERE p.property_id IN (
                 SELECT r.property_id FROM rooms r
                 JOIN leases l ON r.room_id = l.room_id
                 WHERE l.tenant_id = $1 AND l.lease_status = 'active'
               )
               ORDER BY a.created_at DESC`;
      params = [req.user.user_id];
    } else {
      // Landlord or admin - get their announcements
      queryText = `SELECT a.*, p.property_name FROM announcements a
               JOIN properties p ON a.property_id = p.property_id
               WHERE a.landlord_id = $1
               ORDER BY a.created_at DESC`;
      params = [req.user.user_id];
    }

    const result = await pool.query(queryText, params);

    return res.status(200).json({
      message: 'Announcements retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const landlord_id = req.user.user_id;
    
    const checkResult = await pool.query(
      'SELECT * FROM announcements WHERE announcement_id = $1 AND landlord_id = $2',
      [id, landlord_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await pool.query('DELETE FROM announcements WHERE announcement_id = $1', [id]);

    return res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
};
