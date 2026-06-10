// routes/notification.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { getNotifications } = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', verifyToken, getNotifications);

module.exports = router;
