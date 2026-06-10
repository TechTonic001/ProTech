// routes/pwa.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { subscribe, unsubscribe } = require('../controllers/pwa.controller');

const router = express.Router();

router.post('/subscribe', verifyToken, subscribe);
router.delete('/unsubscribe', verifyToken, unsubscribe);

module.exports = router;
