// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendOTPEmail, sendPasswordChangedEmail } = require('../utils/email');

const register = async (req, res, next) => {
  try {
    const { username, full_name, email, phone_number, password, role } = req.body;

    if (!username || !full_name || !email || !phone_number || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const connection = await pool.getConnection();

    // Check email uniqueness
    const [emailCheck] = await connection.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (emailCheck.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Check username uniqueness
    const [usernameCheck] = await connection.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (usernameCheck.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Determine approval status based on role
    const is_approved = role === 'landlord' ? 1 : 0;

    // Insert user
    const [result] = await connection.query(
      'INSERT INTO users (username, full_name, email, phone_number, password_hash, role, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, full_name, email, phone_number, password_hash, role, is_approved]
    );

    const user_id = result.insertId;

    connection.release();

    if (is_approved === 0) {
      // Tenant created but not approved — do not issue token yet
      return res.status(201).json({
        message: 'Account created. Pending landlord approval.',
        data: { user_id, is_approved: 0, email },
      });
    }

    // For approved accounts (landlord), issue token
    const token = jwt.sign(
      { user_id, email, username, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      data: {
        user_id,
        username,
        email,
        role,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // If tenant is not approved, return 403 with clear message
    if (user.role === 'tenant' && !user.is_approved) {
      return res.status(403).json({ error: 'Your account is pending landlord approval. Check your email.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      data: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ error: 'Unable to resolve user' });

    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT user_id, username, full_name, email, phone_number, role, is_approved FROM users WHERE user_id = ?', [userId]);
    connection.release();

    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: users[0] });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User with this email not found' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert OTP record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await connection.query(
      'INSERT INTO password_resets (email, otp_code, is_used, expires_at) VALUES (?, ?, ?, ?)',
      [email, otpCode, 0, expiresAt]
    );

    connection.release();

    // Send OTP email
    await sendOTPEmail(email, otpCode);

    return res.status(200).json({
      message: 'OTP sent to your registered email address',
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp_code, new_password } = req.body;

    if (!email || !otp_code || !new_password) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }

    const connection = await pool.getConnection();

    // Find OTP record
    const [otpRecords] = await connection.query(
      'SELECT * FROM password_resets WHERE email = ? AND otp_code = ? AND is_used = 0 AND expires_at > NOW()',
      [email, otp_code]
    );

    if (otpRecords.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update user password
    await connection.query('UPDATE users SET password_hash = ? WHERE email = ?', [
      password_hash,
      email,
    ]);

    // Mark OTP as used
    const otpRecord = otpRecords[0];
    await connection.query('UPDATE password_resets SET is_used = 1 WHERE reset_id = ?', [
      otpRecord.reset_id,
    ]);

    connection.release();

    // Send confirmation email
    const [users] = await pool.query('SELECT full_name FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      await sendPasswordChangedEmail(email, users[0].full_name);
    }

    return res.status(200).json({
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  profile,
};
