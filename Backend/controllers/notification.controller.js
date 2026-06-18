// controllers/notification.controller.js
const pool = require('../config/db');

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

    const result = await pool.query(queryText, params);

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
};
