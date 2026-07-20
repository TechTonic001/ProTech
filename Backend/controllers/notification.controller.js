// controllers/notification.controller.js
const db = require('../config/db');

// ── GET all notifications (existing) ──────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const role = req.user.role;

    let queryText;
    let params = [user_id];

    if (role === 'landlord') {
      // Landlords see activity feed of reminders/alerts sent to all their tenants
      queryText = `
        SELECT n.*, l.rent_amount, r.room_number, p.property_name, u.full_name as tenant_name
        FROM notifications n
        JOIN leases l ON n.lease_id = l.lease_id
        JOIN rooms r ON l.room_id = r.room_id
        JOIN properties p ON r.property_id = p.property_id
        JOIN users u ON n.tenant_id = u.user_id
        WHERE l.landlord_id = $1
        ORDER BY n.sent_at DESC
        LIMIT 50`;
    } else {
      // Tenants see only their own notifications
      queryText = `
        SELECT n.*, l.rent_amount, r.room_number, p.property_name 
        FROM notifications n
        JOIN leases l ON n.lease_id = l.lease_id
        JOIN rooms r ON l.room_id = r.room_id
        JOIN properties p ON r.property_id = p.property_id
        WHERE n.tenant_id = $1
        ORDER BY n.sent_at DESC
        LIMIT 50`;
    }

    const result = await db.query(queryText, params);

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET notification settings for the authenticated landlord ──────────────────
// Route: GET /api/notification/settings
// Auth:  verifyToken + requireRole('landlord')
const getNotificationSettings = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;

    // Try to find existing settings
    let result = await db.query(
      'SELECT * FROM notification_settings WHERE landlord_id = $1',
      [landlord_id]
    );

    // If no row exists, insert defaults and return them
    if (result.rows.length === 0) {
      result = await db.query(
        `INSERT INTO notification_settings (landlord_id)
         VALUES ($1)
         ON CONFLICT (landlord_id) DO NOTHING
         RETURNING *`,
        [landlord_id]
      );

      // Re-fetch in case ON CONFLICT returned nothing (row already existed)
      if (result.rows.length === 0) {
        result = await db.query(
          'SELECT * FROM notification_settings WHERE landlord_id = $1',
          [landlord_id]
        );
      }
    }

    return res.status(200).json({
      message: 'Notification settings retrieved successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT update notification settings for the authenticated landlord ───────────
// Route: PUT /api/notification/settings
// Auth:  verifyToken + requireRole('landlord')
const updateNotificationSettings = async (req, res, next) => {
  try {
    const landlord_id = req.user.user_id;
    const {
      remind_30_days,
      remind_14_days,
      remind_7_days,
      remind_3_days,
      remind_1_day,
      remind_on_due,
      send_time,
      frequency_overdue,
    } = req.body;

    // Validate send_time format (HH:MM)
    if (send_time !== undefined && !/^\d{2}:\d{2}$/.test(send_time)) {
      return res.status(400).json({
        error: 'Invalid send_time format. Expected HH:MM (e.g. 08:00)',
      });
    }

    // Validate frequency_overdue
    const validFrequencies = ['daily', 'every_2_days', 'weekly'];
    if (frequency_overdue !== undefined && !validFrequencies.includes(frequency_overdue)) {
      return res.status(400).json({
        error: `Invalid frequency_overdue. Must be one of: ${validFrequencies.join(', ')}`,
      });
    }

    // Upsert: update if exists, insert if not
    const result = await db.query(
      `INSERT INTO notification_settings
         (landlord_id, remind_30_days, remind_14_days, remind_7_days,
          remind_3_days, remind_1_day, remind_on_due, send_time,
          frequency_overdue, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (landlord_id) DO UPDATE SET
         remind_30_days    = COALESCE(EXCLUDED.remind_30_days,    notification_settings.remind_30_days),
         remind_14_days    = COALESCE(EXCLUDED.remind_14_days,    notification_settings.remind_14_days),
         remind_7_days     = COALESCE(EXCLUDED.remind_7_days,     notification_settings.remind_7_days),
         remind_3_days     = COALESCE(EXCLUDED.remind_3_days,     notification_settings.remind_3_days),
         remind_1_day      = COALESCE(EXCLUDED.remind_1_day,      notification_settings.remind_1_day),
         remind_on_due     = COALESCE(EXCLUDED.remind_on_due,     notification_settings.remind_on_due),
         send_time         = COALESCE(EXCLUDED.send_time,         notification_settings.send_time),
         frequency_overdue = COALESCE(EXCLUDED.frequency_overdue, notification_settings.frequency_overdue),
         updated_at        = NOW()
       RETURNING *`,
      [
        landlord_id,
        remind_30_days  ?? true,
        remind_14_days  ?? false,
        remind_7_days   ?? true,
        remind_3_days   ?? false,
        remind_1_day    ?? true,
        remind_on_due   ?? true,
        send_time       || '08:00',
        frequency_overdue || 'daily',
      ]
    );

    return res.status(200).json({
      message: 'Notification settings updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getNotificationSettings,
  updateNotificationSettings,
};
