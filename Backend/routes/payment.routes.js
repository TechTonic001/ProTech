// routes/payment.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const {
  createLandlordSubaccount,
  getLandlordBankDetails,
  getBankList,
  initiatePayment,
  getPaymentMetadata,
  getCheckoutInfo,
  getPaymentHistory,
  getReceipt,
  verifyPayment,
} = require('../controllers/payment.controller');

const router = express.Router();

router.post('/subaccount', verifyToken, requireRole('landlord'), createLandlordSubaccount);
router.get('/bank-details', verifyToken, requireRole('landlord'), getLandlordBankDetails);
router.get('/banks', verifyToken, getBankList);
router.get('/metadata', verifyToken, getPaymentMetadata);
router.get('/checkout/:lease_id', verifyToken, requireRole('tenant'), getCheckoutInfo);
router.post('/initiate', verifyToken, requireRole('tenant'), initiatePayment);
router.get('/history', verifyToken, getPaymentHistory);
router.get('/receipt/:reference', verifyToken, getReceipt);
router.get('/verify/:reference', verifyToken, verifyPayment);

module.exports = router;
