// routes/payment.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { rawBodyMiddleware } = require('../middleware/rawBody.middleware');
const {
  createLandlordSubaccount,
  initiatePayment,
  paystackWebhook,
  getPaymentHistory,
} = require('../controllers/payment.controller');

const router = express.Router();

router.post('/subaccount', verifyToken, requireRole('landlord'), createLandlordSubaccount);
router.post('/initiate', verifyToken, requireRole('tenant'), initiatePayment);
router.get('/history', verifyToken, getPaymentHistory);

module.exports = router;
