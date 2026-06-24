// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query: dbQuery } = require('../config/db');
const { 
  sendOTPEmail, 
  sendPasswordChangedEmail,
  sendLandlordWelcomeEmail,
  sendTenantWelcomeEmail,
  sendLandlordTenantRegistrationNotificationEmail
} = require('../utils/email');
const { generateUniqueLandlordCode } = require('../utils/generateCode');
const { validatePassword } = require('../utils/validatePassword');

const register = async (req, res, next) => {
  try {
    const { 
      username, 
      full_name, 
      email, 
      phone_number, 
      password, 
      role
    } = req.body;

    if (!username || !full_name || !email || !phone_number || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!role) {
      return res.status(400).json({ error: 'Account role is required.' });
    }

    // Role validation: reject admin or invalid roles
    if (role === 'admin') {
      return res.status(400).json({ error: 'Admin accounts cannot be registered via this API endpoint.' });
    }
    if (role !== 'landlord' && role !== 'tenant') {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // Password strength validation (runs before DB checks to fail fast)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        error: passwordCheck.errors[0],
        all_errors: passwordCheck.errors
      });
    }

    // Email uniqueness check — email is the sole unique identifier in this system
    const emailCheck = await dbQuery('SELECT user_id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Role specific validation
    let landlord = null;
    let landlordCode = null;
    if (role === 'landlord') {
      landlordCode = await generateUniqueLandlordCode(dbQuery);
    } else if (role === 'tenant') {
      const { landlord_code } = req.body;
      if (!landlord_code || landlord_code.trim() === '') {
        return res.status(400).json({
          error: "Please enter your landlord's unique code to register."
        });
      }

      // Clean the code — uppercase, trim spaces
      const cleanCode = landlord_code.trim().toUpperCase();

      const landlordResult = await dbQuery(
        "SELECT user_id, email, full_name, hostel_name, username FROM users WHERE landlord_code = $1 AND role = 'landlord'",
        [cleanCode]
      );

      if (landlordResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Landlord code not found. Please check the code and try again.'
        });
      }
      landlord = landlordResult.rows[0];
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Approval status mapping
    const is_approved = role === 'landlord' ? 1 : 0;

    // Create user
    const result = await dbQuery(
      'INSERT INTO users (username, full_name, email, phone_number, password_hash, role, is_approved, landlord_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id, landlord_code',
      [
        username.trim(),
        full_name.trim(),
        email.trim(),
        phone_number.trim(),
        password_hash,
        role,
        is_approved,
        landlordCode
      ]
    );

    const user_id = result.rows[0].user_id;
    const dbLandlordCode = result.rows[0].landlord_code;

    if (role === 'landlord') {
      // Send Landlord Welcome email in background
      sendLandlordWelcomeEmail(email, full_name, '', dbLandlordCode)
        .catch(err => console.error('[ERROR] Failed to send landlord welcome email:', err.message));
    } else if (role === 'tenant' && landlord) {
      // Find landlord's primary property
      const propertyResult = await dbQuery(
        'SELECT property_id FROM properties WHERE landlord_id = $1 ORDER BY created_at ASC LIMIT 1',
        [landlord.user_id]
      );
      
      const property_id = (propertyResult.rows.length > 0 && propertyResult.rows[0].property_id) ? propertyResult.rows[0].property_id : 0;

      // Create pending registration approval log
      try {
        await dbQuery(
          'INSERT INTO tenant_approvals (tenant_id, landlord_id, property_id, status) VALUES ($1, $2, $3, $4)',
          [user_id, landlord.user_id, property_id, 'pending']
        );
        console.log('[APPROVAL CREATED] tenant:', user_id, 'landlord:', landlord.user_id);
      } catch (err) {
        console.error('[APPROVAL INSERT FAILED]', err.message);
      }

      // Send Tenant Welcome and Landlord Notification emails in background
      sendTenantWelcomeEmail(email, full_name, landlord.username)
        .catch(err => console.error('[ERROR] Failed to send tenant welcome email:', err.message));
      sendLandlordTenantRegistrationNotificationEmail(landlord.email, landlord.full_name, full_name)
        .catch(err => console.error('[ERROR] Failed to send landlord notification email:', err.message));
    }

    if (is_approved === 0) {
      return res.status(201).json({
        message: 'Account created. Pending landlord approval.',
        data: { user_id, is_approved: 0, email },
        landlord_hostel: landlord ? landlord.hostel_name : null
      });
    }

    // Auto-login for landlords
    const token = jwt.sign(
      { user_id, email, username, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      data: {
        token,
        user: {
          user_id,
          username,
          email,
          full_name,
          role,
          is_approved,
          landlord_code: dbLandlordCode
        },
      },
    });
  } catch (error) {
    console.error('[ERROR] Registration error:', error.message);
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const result = await dbQuery(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [identifier, identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check tenant approval
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
          phone_number: user.phone_number,
          role: user.role,
          is_approved: user.is_approved,
          hostel_name: user.hostel_name,
          hostel_address: user.hostel_address,
          landlord_code: user.landlord_code,
          subaccount_code: user.subaccount_code,
        },
      },
    });
  } catch (error) {
    console.error('[ERROR] Login error:', error.message);
    next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ error: 'Unable to resolve user' });

    const result = await dbQuery(
      'SELECT user_id, username, full_name, email, phone_number, role, is_approved, hostel_name, hostel_address, landlord_code FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] Fetch profile error:', error.message);
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ error: 'Unable to resolve user' });

    const { full_name, phone_number, hostel_name, hostel_address } = req.body;

    // Get current user to check role
    const result = await dbQuery('SELECT role FROM users WHERE user_id = $1', [userId]);
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
    await dbQuery(`UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramCount}`, values);

    // Return updated user
    const updatedResult = await dbQuery(
      'SELECT user_id, username, full_name, email, phone_number, role, is_approved, hostel_name, hostel_address, landlord_code FROM users WHERE user_id = $1',
      [userId]
    );

    return res.status(200).json({ message: 'Profile updated successfully', user: updatedResult.rows[0] });
  } catch (error) {
    console.error('[ERROR] Update profile error:', error.message);
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await dbQuery('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert OTP record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await dbQuery(
      'INSERT INTO password_resets (email, otp_code, is_used, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otpCode, 0, expiresAt]
    );

    // Send OTP email in background
    sendOTPEmail(email, otpCode)
      .catch(err => console.error('[ERROR] Failed to send OTP email:', err.message));

    return res.status(200).json({
      message: 'OTP sent to your registered email address',
    });
  } catch (error) {
    console.error('[ERROR] Forgot password error:', error.message);
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
    const result = await dbQuery(
      'SELECT * FROM password_resets WHERE email = $1 AND otp_code = $2 AND is_used = 0 AND expires_at > NOW()',
      [email, otpValue]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Validate new password strength before hashing
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        error: passwordCheck.errors[0],
        all_errors: passwordCheck.errors
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Update user password
    await dbQuery('UPDATE users SET password_hash = $1 WHERE email = $2', [
      password_hash,
      email,
    ]);

    // Mark OTP as used
    const otpRecord = result.rows[0];
    await dbQuery('UPDATE password_resets SET is_used = 1 WHERE reset_id = $1', [
      otpRecord.reset_id,
    ]);

    // Send confirmation email in background
    const userResult = await dbQuery('SELECT full_name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      sendPasswordChangedEmail(email, userResult.rows[0].full_name)
        .catch(err => console.error('[ERROR] Failed to send password changed email:', err.message));
    }

    return res.status(200).json({
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('[ERROR] Reset password error:', error.message);
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
