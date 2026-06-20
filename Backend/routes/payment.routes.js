// routes/payment.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createLandlordSubaccount,
  getBankList,
  initiatePayment,
  getPaymentHistory,
  getReceipt,
  verifyPayment,
} = require('../controllers/payment.controller');

const router = express.Router();

router.post('/subaccount', verifyToken, requireRole('landlord'), createLandlordSubaccount);
router.get('/banks', verifyToken, getBankList);
router.post('/initiate', verifyToken, requireRole('tenant'), initiatePayment);
router.get('/history', verifyToken, getPaymentHistory);
router.get('/receipt/:reference', verifyToken, getReceipt);
router.get('/verify/:reference', verifyToken, verifyPayment);

module.exports = router;
