// routes/property.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  softDeleteProperty,
  restoreProperty,
  getDeletedProperties,
} = require('../controllers/property.controller');

const router = express.Router();

router.post('/', verifyToken, requireRole('landlord'), createProperty);
router.get('/', verifyToken, requireRole('landlord'), getProperties);
// Static routes before dynamic :id routes
router.get('/deleted', verifyToken, requireRole('landlord'), getDeletedProperties);
router.get('/:id', verifyToken, requireRole('landlord'), getPropertyById);
router.put('/:id', verifyToken, requireRole('landlord'), updateProperty);
router.delete('/:id', verifyToken, requireRole('landlord'), softDeleteProperty);
router.post('/:id/restore', verifyToken, requireRole('landlord'), restoreProperty);

module.exports = router;
