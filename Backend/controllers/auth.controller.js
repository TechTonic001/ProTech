// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendOTPEmail, sendPasswordChangedEmail } = require('../utils/email');

const register = async (req, res, next) => {
  try {
    const { username, full_name, email, phone_number, password, role, hostel_name, hostel_address } = req.body;

    if (!username || !full_name || !email || !phone_number || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hostel validation — landlords only
    if (role === 'landlord') {
      if (!hostel_name || hostel_name.trim() === '') {
        return res.status(400).json({ error: 'Hostel name is required for landlords.' });
      }
      if (!hostel_address || hostel_address.trim() === '') {
        return res.status(400).json({ error: 'Hostel address is required for landlords.' });
      }
    }

    // Check email uniqueness
    const emailCheck = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Check username uniqueness
    const usernameCheck = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Determine approval status based on role
    const is_approved = role === 'landlord' ? 1 : 0;

    // Insert user with hostel columns
    const result = await pool.query(
      'INSERT INTO users (username, full_name, email, phone_number, password_hash, role, is_approved, hostel_name, hostel_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id',
      [
        username, full_name, email, phone_number, password_hash, role, is_approved,
        role === 'landlord' ? hostel_name : null,
        role === 'landlord' ? hostel_address : null,
      ]
    );

    const user_id = result.rows[0].user_id;

    if (is_approved === 0) {
      return res.status(201).json({
        message: 'Account created. Pending landlord approval.',
        data: { user_id, is_approved: 0, email },
      });
    }

    return res.status(201).json({
      message: 'Account created successfully. Please sign in.',
      data: {
        user_id,
        username,
        email,
        role,
        is_approved,
        hostel_name: role === 'landlord' ? hostel_name : null,
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

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [identifier, identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

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
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
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

    const result = await pool.query(
      'SELECT user_id, username, full_name, email, phone_number, role, is_approved, hostel_name, hostel_address FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ error: 'Unable to resolve user' });

    const { full_name, phone_number, hostel_name, hostel_address } = req.body;

    // Get current user to check role
    const result = await pool.query('SELECT role FROM users WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRole = result.rows[0].role;

    // Build dynamic update
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) { 
      fields.push(`full_name = $${paramCount++}`); 
      values.push(full_name); 
    }
    if (phone_number !== undefined) { 
      fields.push(`phone_number = $${paramCount++}`); 
      values.push(phone_number); 
    }

    // Only allow hostel fields for landlords
    if (userRole === 'landlord') {
      if (hostel_name !== undefined) { 
        fields.push(`hostel_name = $${paramCount++}`); 
        values.push(hostel_name); 
      }
      if (hostel_address !== undefined) { 
        fields.push(`hostel_address = $${paramCount++}`); 
        values.push(hostel_address); 
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramCount}`, values);

    // Return updated user
    const updatedResult = await pool.query(
      'SELECT user_id, username, full_name, email, phone_number, role, is_approved, hostel_name, hostel_address FROM users WHERE user_id = $1',
      [userId]
    );

    return res.status(200).json({ message: 'Profile updated successfully', user: updatedResult.rows[0] });
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

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert OTP record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await pool.query(
      'INSERT INTO password_resets (email, otp_code, is_used, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otpCode, 0, expiresAt]
    );

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
    const { email, otp_code, otp, new_password, password } = req.body;
    const otpValue = otp_code || otp;
    const newPassword = new_password || password;

    if (!email || !otpValue || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }

    // Find OTP record
    const result = await pool.query(
      'SELECT * FROM password_resets WHERE email = $1 AND otp_code = $2 AND is_used = 0 AND expires_at > NOW()',
      [email, otpValue]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Update user password
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
      password_hash,
      email,
    ]);

    // Mark OTP as used
    const otpRecord = result.rows[0];
    await pool.query('UPDATE password_resets SET is_used = 1 WHERE reset_id = $1', [
      otpRecord.reset_id,
    ]);

    // Send confirmation email
    const userResult = await pool.query('SELECT full_name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      await sendPasswordChangedEmail(email, userResult.rows[0].full_name);
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
  updateProfile,
};
