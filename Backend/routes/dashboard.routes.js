const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { getLandlordDashboardStats } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/landlord', verifyToken, requireRole('landlord'), getLandlordDashboardStats);

module.exports = router;