// routes/admin.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  getStats,
  getLandlords,
  getTenants,
  getPayments,
  getProperties
} = require('../controllers/admin.controller');

const router = express.Router();
router.get('/stats', verifyToken, requireRole('admin'), getStats);
router.get('/landlords', verifyToken, requireRole('admin'), getLandlords);
router.get('/tenants', verifyToken, requireRole('admin'), getTenants);
router.get('/payments', verifyToken, requireRole('admin'), getPayments);
router.get('/properties', verifyToken, requireRole('admin'), getProperties);

module.exports = router;
