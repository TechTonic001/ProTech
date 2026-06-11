// routes/payments_verify.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { verifyPayment } = require('../controllers/payment.verify.controller');

const router = express.Router();

router.get('/verify/:reference', verifyToken, verifyPayment);

module.exports = router;
