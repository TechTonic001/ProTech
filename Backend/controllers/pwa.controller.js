// controllers/pwa.controller.js
const pool = require('../config/db');

const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys, deviceInfo } = req.body;
    const user_id = req.user.user_id;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Endpoint and keys are required' });
    }

    // Check if subscription already exists
    const existingResult = await pool.query(
      'SELECT subscription_id FROM pwa_subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (existingResult.rows.length > 0) {
      // Update existing subscription to active and assign to current user
      await pool.query(
        'UPDATE pwa_subscriptions SET is_active = 1, user_id = $1 WHERE endpoint = $2',
        [user_id, endpoint]
      );
      return res.status(200).json({
        message: 'Subscribed successfully.',
      });
    }

    // Create new subscription
    const result = await pool.query(
      'INSERT INTO pwa_subscriptions (user_id, endpoint, p256dh_key, auth_key, device_info, is_active) VALUES ($1, $2, $3, $4, $5, 1) RETURNING subscription_id',
      [user_id, endpoint, keys.p256dh, keys.auth, deviceInfo || 'unknown']
    );

    return res.status(201).json({
      message: 'Subscribed successfully.',
      data: {
        subscription_id: result.rows[0].subscription_id,
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

    await pool.query(
      'UPDATE pwa_subscriptions SET is_active = 0 WHERE endpoint = $1 AND user_id = $2',
      [endpoint, user_id]
    );

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
