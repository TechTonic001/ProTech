// routes/auth.routes.js
const express = require('express');
const { register, login, forgotPassword, resetPassword, profile } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', resetPassword);
router.get('/profile', verifyToken, profile);

module.exports = router;
