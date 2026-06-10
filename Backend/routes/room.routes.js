// routes/room.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createRoom,
  getRoomsByProperty,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require('../controllers/room.controller');

const router = express.Router();

router.post('/', verifyToken, requireRole('landlord'), createRoom);
router.get('/property/:property_id', verifyToken, requireRole('landlord'), getRoomsByProperty);
router.get('/:room_id', verifyToken, getRoomById);
router.put('/:room_id', verifyToken, requireRole('landlord'), updateRoom);
router.delete('/:room_id', verifyToken, requireRole('landlord'), deleteRoom);

module.exports = router;
