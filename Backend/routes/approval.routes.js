// routes/approval.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  requestApproval,
  getPendingApprovals,
  processApproval,
  getApprovedApprovals,
} = require('../controllers/approval.controller');

const router = express.Router();

router.post('/request', verifyToken, requireRole('tenant'), requestApproval);
router.get('/pending', verifyToken, requireRole('landlord', 'admin'), getPendingApprovals);
router.get('/approved', verifyToken, requireRole('landlord', 'admin'), getApprovedApprovals);
router.put('/:id', verifyToken, requireRole('landlord', 'admin'), processApproval);

module.exports = router;
