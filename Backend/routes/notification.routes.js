// routes/notification.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  getNotifications,
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/notification.controller');
const { runNotificationEngine } = require('../utils/notificationEngine');
const asyncHandler = require('../utils/asyncHandler').asyncHandler;

const router = express.Router();

// Activity feed — both landlords and tenants
router.get('/', verifyToken, getNotifications);

// Notification settings — landlord only
router.get('/settings', verifyToken, requireRole('landlord'), getNotificationSettings);
router.put('/settings', verifyToken, requireRole('landlord'), updateNotificationSettings);

// Manual trigger for testing (admin only)
router.post('/trigger-now', verifyToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const now = new Date();
  const hour = now.toLocaleString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', hour12: false }).padStart(2,'0');
  await runNotificationEngine(hour);
  return res.status(200).json({ message: `Engine run for hour ${hour}:00 WAT` });
}));

module.exports = router;
