// routes/property.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} = require('../controllers/property.controller');

const router = express.Router();

router.post('/', verifyToken, requireRole('landlord'), createProperty);
router.get('/', verifyToken, requireRole('landlord'), getProperties);
router.get('/:id', verifyToken, requireRole('landlord'), getPropertyById);
router.put('/:id', verifyToken, requireRole('landlord'), updateProperty);
router.delete('/:id', verifyToken, requireRole('landlord'), deleteProperty);

module.exports = router;
