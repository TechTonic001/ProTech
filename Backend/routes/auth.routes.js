// routes/auth.routes.js
const express = require('express');
const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  profile,
  updateProfile,
} = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// ── Public auth routes ──────────────────────────────────────────────────────
router.post('/register',       register);
router.post('/login',          login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-otp',     resetPassword);

// ── Token management ─────────────────────────────────────────────────────────
// /refresh — reads the HttpOnly cookie and issues a new short-lived access token.
//            No verifyToken middleware here: the cookie IS the credential.
// /logout  — clears the HttpOnly cookie.  No token auth required.
router.post('/refresh', refreshToken);
router.post('/logout',  logout);

// ── Protected profile routes ─────────────────────────────────────────────────
router.get('/profile',  verifyToken, profile);
router.put('/profile',  verifyToken, updateProfile);

module.exports = router;
