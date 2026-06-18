// controllers/payment.verify.controller.js
const pool = require('../config/db');

const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId = req.user.user_id;

    const result = await pool.query(
      'SELECT * FROM payments WHERE paystack_ref = $1 AND tenant_id = $2',
      [reference, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    return res.status(200).json({ message: 'Payment found', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyPayment };
