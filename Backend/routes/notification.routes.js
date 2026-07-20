// routes/notification.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  getNotifications,
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/notification.controller');

const router = express.Router();

// Activity feed — both landlords and tenants
router.get('/', verifyToken, getNotifications);

// Notification settings — landlord only
router.get('/settings', verifyToken, requireRole('landlord'), getNotificationSettings);
router.put('/settings', verifyToken, requireRole('landlord'), updateNotificationSettings);

module.exports = router;
