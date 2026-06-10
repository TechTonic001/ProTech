// controllers/pwa.controller.js
const pool = require('../config/db');

const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys, deviceInfo } = req.body;
    const user_id = req.user.user_id;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Endpoint and keys are required' });
    }

    const connection = await pool.getConnection();

    // Check if subscription already exists
    const [existingSubscriptions] = await connection.query(
      'SELECT * FROM pwa_subscriptions WHERE endpoint = ? AND user_id = ?',
      [endpoint, user_id]
    );

    if (existingSubscriptions.length > 0) {
      // Update existing subscription to active
      await connection.query(
        'UPDATE pwa_subscriptions SET is_active = 1 WHERE endpoint = ? AND user_id = ?',
        [endpoint, user_id]
      );
      connection.release();
      return res.status(200).json({
        message: 'Subscription updated',
      });
    }

    // Create new subscription
    const [result] = await connection.query(
      'INSERT INTO pwa_subscriptions (user_id, endpoint, p256dh_key, auth_key, device_info) VALUES (?, ?, ?, ?, ?)',
      [user_id, endpoint, keys.p256dh, keys.auth, deviceInfo || null]
    );

    connection.release();

    return res.status(201).json({
      message: 'Subscription created',
      data: {
        subscription_id: result.insertId,
      },
    });
  } catch (error) {
    next(error);
  }
};

const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    const user_id = req.user.user_id;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE pwa_subscriptions SET is_active = 0 WHERE endpoint = ? AND user_id = ?',
      [endpoint, user_id]
    );
    connection.release();

    return res.status(200).json({
      message: 'Subscription removed',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribe,
  unsubscribe,
};
