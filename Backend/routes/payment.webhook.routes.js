const express = require('express');
const { paystackWebhook } = require('../controllers/payment.controller');

const router = express.Router();

router.post('/', paystackWebhook);

module.exports = router;
