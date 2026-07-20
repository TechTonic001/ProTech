// jobs/notificationCron.js
// NOTE: This file is kept for backward compatibility but is no longer the
// primary scheduler. The notification engine has been moved to:
//   utils/notificationEngine.js  (the engine logic)
//   server.js                    (the hourly cron.schedule call)
//
// The new engine respects per-landlord notification_settings (Issue 1B).

const startNotificationCron = () => {
  console.log('[CRON] Legacy notificationCron.js — engine now runs from server.js hourly cron.');
};

module.exports = { startNotificationCron };
