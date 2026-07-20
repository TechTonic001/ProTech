// routes/landlord.routes.js
// Tenant management routes for landlords (soft delete, restore, recycle bin)
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  softDeleteTenant,
  restoreTenant,
  getDeletedTenants,
} = require('../controllers/landlord.controller');

const router = express.Router();

// Static routes before dynamic :tenant_id routes to avoid conflicts
router.get('/deleted', verifyToken, requireRole('landlord'), getDeletedTenants);
router.delete('/:tenant_id', verifyToken, requireRole('landlord'), softDeleteTenant);
router.post('/:tenant_id/restore', verifyToken, requireRole('landlord'), restoreTenant);

module.exports = router;
