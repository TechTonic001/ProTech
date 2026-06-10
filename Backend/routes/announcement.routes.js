// routes/announcement.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createAnnouncement,
  getAnnouncements,
} = require('../controllers/announcement.controller');

const router = express.Router();

router.post('/', verifyToken, requireRole('landlord'), createAnnouncement);
router.get('/', verifyToken, getAnnouncements);

module.exports = router;
