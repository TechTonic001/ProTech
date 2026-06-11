// controllers/payment.verify.controller.js
const pool = require('../config/db');

const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const userId = req.user.user_id;

    const connection = await pool.getConnection();
    const [payments] = await connection.query('SELECT * FROM payments WHERE paystack_ref = ? AND tenant_id = ?', [reference, userId]);
    connection.release();

    if (payments.length === 0) return res.status(404).json({ message: 'Payment not found' });

    return res.status(200).json({ message: 'Payment found', data: payments[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyPayment };
