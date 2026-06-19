// utils/push.js
const webpush = require('web-push');
const pool = require('../config/db');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendPushNotification = async (userId, title, body, url = '/') => {
  try {
    const result = await pool.query(
      'SELECT * FROM pwa_subscriptions WHERE user_id = $1 AND is_active = 1',
      [userId]
    );

    const subscriptions = result.rows;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[PUSH] No active subscriptions for user', userId);
      return;
    }

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key
        }
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        console.error('[PUSH FAILED] sub:', sub.subscription_id, err.message);
        if (err.statusCode === 410) {
          // subscription expired — deactivate it
          await pool.query(
            'UPDATE pwa_subscriptions SET is_active = 0 WHERE subscription_id = $1',
            [sub.subscription_id]
          );
        }
      }
    }
  } catch (err) {
    console.error('[PUSH ERROR]', err.message);
  }
};

module.exports = {
  sendPushNotification,
};
