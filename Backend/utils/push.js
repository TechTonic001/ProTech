// utils/push.js
const webpush = require('web-push');
const pool = require('../config/db');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendPushNotification = async (userId, title, body, url = null) => {
  try {
    const connection = await pool.getConnection();
    const [subscriptions] = await connection.query(
      'SELECT * FROM pwa_subscriptions WHERE user_id = ? AND is_active = 1',
      [userId]
    );
    connection.release();

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, message: 'No active subscriptions' };
    }

    const notificationPayload = {
      title: title,
      body: body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: url ? { url: url } : {},
    };

    const results = [];
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload));
        results.push({ success: true, endpoint: subscription.endpoint });
      } catch (error) {
        console.error(`Push notification error for subscription ${subscription.subscription_id}:`, error.message);
        results.push({ success: false, endpoint: subscription.endpoint, error: error.message });
      }
    }

    return { success: true, results: results };
  } catch (error) {
    console.error('Error sending push notifications:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
};
