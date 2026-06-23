// routes/test.routes.js
const express = require('express');
const router = express.Router();

// Import the email utility or use a custom send
const { sendOTPEmail } = require('../utils/email');

router.post('/test-email', async (req, res) => {
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
