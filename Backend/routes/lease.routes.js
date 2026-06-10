// routes/lease.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createLease,
  getLeasesByLandlord,
  getLeasesByTenant,
  getLeaseById,
  updateLease,
  terminateLease,
} = require('../controllers/lease.controller');

const router = express.Router();

router.post('/', verifyToken, requireRole('landlord'), createLease);
router.get('/landlord/active', verifyToken, requireRole('landlord'), getLeasesByLandlord);
router.get('/tenant/active', verifyToken, requireRole('tenant'), getLeasesByTenant);
router.get('/:lease_id', verifyToken, getLeaseById);
router.put('/:lease_id', verifyToken, requireRole('landlord'), updateLease);
router.patch('/:lease_id/terminate', verifyToken, requireRole('landlord'), terminateLease);

module.exports = router;
