// routes/test.routes.js
const express = require('express');
const router = express.Router();

// Auth guards — V6 fix: test routes must only be callable by authenticated admins
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Import the email utility or use a custom send
const { sendOTPEmail } = require('../utils/email');

// Guard: verifyToken ensures a valid JWT is present.
// requireRole('admin') ensures only admin accounts can trigger test emails.
// This prevents anonymous callers from abusing the SMTP account (OWASP A05 — V6).
router.post('/test-email', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const targetEmail = 'protech78902@gmail.com';
    const testOTP = '123456';
    
    console.log('[TEST EMAIL] Attempting to send test email to:', targetEmail);
    const result = await sendOTPEmail(targetEmail, testOTP);

    if (result.success) {
      return res.status(200).json({
        message: 'Test email sent successfully',
        recipient: targetEmail,
      });
    } else {
      return res.status(500).json({
        error: 'Failed to send test email',
        details: result.error,
      });
    }
  } catch (err) {
    console.error('[TEST EMAIL ROUTE ERROR]', err);
    return res.status(500).json({
      error: 'Test email route error',
      message: err.message,
    });
  }
});

module.exports = router;

