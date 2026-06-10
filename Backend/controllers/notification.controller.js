// controllers/notification.controller.js
const pool = require('../config/db');

const getNotifications = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;

    const connection = await pool.getConnection();
    const [notifications] = await connection.query(
      `SELECT n.*, l.rent_amount, r.room_number, p.property_name FROM notifications n
       JOIN leases l ON n.lease_id = l.lease_id
       JOIN rooms r ON l.room_id = r.room_id
       JOIN properties p ON r.property_id = p.property_id
       WHERE n.tenant_id = ?
       ORDER BY n.sent_at DESC
       LIMIT 50`,
      [user_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
};
