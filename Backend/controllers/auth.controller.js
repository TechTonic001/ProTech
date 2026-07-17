// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query: dbQuery } = require('../config/db');
const {
  sendOTPEmail,
  sendPasswordChangedEmail,
  sendLandlordWelcomeEmail,
  sendTenantWelcomeEmail,
  sendLandlordTenantRegistrationNotificationEmail,
} = require('../utils/email');
const { generateUniqueLandlordCode } = require('../utils/generateCode');
const { validatePassword } = require('../utils/validatePassword');
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/tokenUtils');

const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeRegistrationPayload = (body = {}) => {
  const role = normalizeText(body.role || body.accountType || body.roleType || body.expectedRole).toLowerCase();
  const username = normalizeText(body.username || body.userName || body.user_name);
  const full_name = normalizeText(body.full_name || body.fullname || body.fullName || body.name);
  const email = normalizeText(body.email);
  const phone_number = normalizeText(body.phone_number || body.phone || body.phoneNumber);
  const password = typeof body.password === 'string' ? body.password : '';
  const landlord_code = normalizeText(body.landlord_code || body.landlordCode);

  return {
    username,
    full_name,
    email,
    phone_number,
    password,
    role: role || 'landlord',
    landlord_code,
  };
};

const normalizeLoginPayload = (body = {}) => {
  const identifier = normalizeText(body.identifier || body.email || body.username || body.login);
  const password = typeof body.password === 'string' ? body.password : '';
  const expectedRole = normalizeText(body.expectedRole || body.role || body.accountType || body.roleType).toLowerCase();

  return { identifier, password, expectedRole };
};

const ensureLandlordCode = async (user) => {
  if (!user || user.role !== 'landlord') return user;
  if (user.landlord_code) return user;

  const landlordCode = await generateUniqueLandlordCode(dbQuery);
  try {
    await dbQuery(
      'UPDATE users SET landlord_code = $1 WHERE user_id = $2',
      [landlordCode, user.user_id],
    );
    return { ...user, landlord_code: landlordCode };
  } catch (error) {
    console.error('[LANDLORD CODE] Failed to save landlord code:', error.message);
    return { ...user, landlord_code: landlordCode };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// Landlord: 5 fields only — username, full_name, email, phone_number, password
// Tenant:   same 5 fields + landlord_code
// Any hostel/property fields sent during registration are ignored.
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const {
      username,
      full_name,
      email,
      phone_number,
      password,
      role,
      landlord_code,
    } = normalizeRegistrationPayload(req.body);

    // ── Basic required field check ──
    if (!username || !full_name || !email || !phone_number || !password) {
      return res.status(400).json({
        error: 'Username, full name, email, phone number, and password are required.',
      });
    }

    if (!role) {
      return res.status(400).json({ error: 'Account role is required.' });
    }

    // ── Role gate ──
    if (role === 'admin') {
      return res.status(403).json({
        error: 'Admin accounts cannot be created through registration.',
      });
    }
    if (role !== 'landlord' && role !== 'tenant') {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // ── Password strength (fail fast, before any DB work) ──
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        error: passwordCheck.errors[0],
        all_errors: passwordCheck.errors,
      });
    }

    // ── Tenant must supply a landlord code ──
    if (role === 'tenant' && (!landlord_code || landlord_code.trim() === '')) {
      return res.status(400).json({
        error: "Please enter your landlord's unique code to register.",
      });
    }

    // ── Email uniqueness (sole unique identifier) ──
    const emailCheck = await dbQuery(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const usernameCheck = await dbQuery(
      'SELECT user_id FROM users WHERE username = $1',
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // ══════════════════════════════════════════════════════
    // LANDLORD PATH — dual-token issued on successful registration
    // ══════════════════════════════════════════════════════
    if (role === 'landlord') {
      let landlordCode;
      try {
        landlordCode = await generateUniqueLandlordCode(dbQuery);
      } catch (codeErr) {
        console.error('[LANDLORD CODE ERROR]', codeErr.message);
        landlordCode = `PT-${Date.now().toString().slice(-6).toUpperCase()}`;
      }

      let result;
      let landlordCodeColumnExists = { rows: [] };
      try {
        landlordCodeColumnExists = await dbQuery(
          `SELECT 1 FROM information_schema.columns
           WHERE table_name = 'users' AND column_name = 'landlord_code'`
        );

        const insertQuery = landlordCodeColumnExists.rows.length > 0
          ? `INSERT INTO users
             (username, full_name, email, phone_number,
              password_hash, role, is_approved, landlord_code)
           VALUES ($1, $2, $3, $4, $5, 'landlord', 1, $6)
           RETURNING user_id, landlord_code`
          : `INSERT INTO users
             (username, full_name, email, phone_number,
              password_hash, role, is_approved)
           VALUES ($1, $2, $3, $4, $5, 'landlord', 1)
           RETURNING user_id`;

        const insertValues = landlordCodeColumnExists.rows.length > 0
          ? [username, full_name, email, phone_number, password_hash, landlordCode]
          : [username, full_name, email, phone_number, password_hash];

        result = await dbQuery(insertQuery, insertValues);
      } catch (dbErr) {
        console.error('[REGISTER DB ERROR]', dbErr.message);
        return res.status(500).json({
          error: 'We could not create your account right now. Please try again in a moment.',
          details: dbErr.message,
        });
      }

      const newLandlord = result.rows[0];
      const createdLandlordCode = landlordCodeColumnExists?.rows?.length > 0 ? (newLandlord.landlord_code || landlordCode) : landlordCode;

      // ── Issue dual tokens ──
      const tokenPayload = {
        user_id: newLandlord.user_id,
        email,
        username,
        role: 'landlord',
      };
      const accessToken  = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Set the refresh token as a secure HttpOnly cookie
      setRefreshCookie(res, refreshToken);

      try {
        await sendLandlordWelcomeEmail(
          email,
          full_name,
          null,
          createdLandlordCode
        );
      } catch (emailErr) {
        console.error('[EMAIL ERROR] Landlord welcome:', emailErr.message);
      }

      return res.status(201).json({
        message: 'Landlord account created successfully.',
        data: {
          accessToken,
          user: {
            user_id: newLandlord.user_id,
            username,
            full_name,
            email,
            phone_number,
            role: 'landlord',
            is_approved: 1,
            hostel_name: null,
            hostel_address: null,
            landlord_code: createdLandlordCode,
          },
        },
      });
    }

    // ══════════════════════════════════════════════════════
    // TENANT PATH — NO token issued (account is pending approval)
    // ══════════════════════════════════════════════════════
    if (role === 'tenant') {
      const cleanCode = landlord_code.toUpperCase();

      const landlordResult = await dbQuery(
        `SELECT user_id, email, full_name, hostel_name, username
         FROM users WHERE landlord_code = $1 AND role = 'landlord'`,
        [cleanCode]
      );

      if (landlordResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Landlord code not found. Please check the code and try again.',
        });
      }

      const landlord = landlordResult.rows[0];

      const result = await dbQuery(
        `INSERT INTO users
           (username, full_name, email, phone_number,
            password_hash, role, is_approved)
         VALUES ($1, $2, $3, $4, $5, 'tenant', 0)
         RETURNING user_id`,
        [
          username.trim(),
          full_name.trim(),
          email.trim(),
          phone_number.trim(),
          password_hash,
        ]
      );



      const newTenantId = result.rows[0].user_id;

      // Create pending approval record (non-fatal if it fails)
      try {
        const propertyResult = await dbQuery(
          'SELECT property_id FROM properties WHERE landlord_id = $1 ORDER BY created_at ASC LIMIT 1',
          [landlord.user_id]
        );
        const property_id =
          propertyResult.rows.length > 0 ? propertyResult.rows[0].property_id : 0;

        await dbQuery(
          `INSERT INTO tenant_approvals (tenant_id, landlord_id, property_id, status)
           VALUES ($1, $2, $3, 'pending')`,
          [newTenantId, landlord.user_id, property_id]
        );
        console.log('[APPROVAL CREATED] tenant:', newTenantId, 'landlord:', landlord.user_id);
      } catch (approvalErr) {
        console.error('[APPROVAL INSERT FAILED]', approvalErr.message);
      }

      // Send emails but do not fail registration if mail delivery fails
      try {
        await sendTenantWelcomeEmail(email, full_name, landlord.username);
      } catch (emailErr) {
        console.error('[EMAIL ERROR] Tenant welcome:', emailErr.message);
      }

      try {
        await sendLandlordTenantRegistrationNotificationEmail(
          landlord.email,
          landlord.full_name,
          full_name
        );
      } catch (emailErr) {
        console.error('[EMAIL ERROR] Landlord notification:', emailErr.message);
      }

      return res.status(201).json({
        message: 'Tenant account created. Waiting for landlord approval.',
        data: {
          user_id: newTenantId,
          is_approved: 0,
          email: email.trim(),
        },
        landlord_hostel: landlord.hostel_name || null,
      });
    }
  } catch (error) {
    console.error('[REGISTER ERROR]', error.message);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { identifier, password, expectedRole } = normalizeLoginPayload(req.body);

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    // Explicit columns — avoids leaking password_hash, tokens, and internal fields
    const result = await dbQuery(
      `SELECT user_id, username, email, full_name, phone_number,
              role, is_approved, hostel_name, hostel_address,
              landlord_code, subaccount_code, password_hash
       FROM users
       WHERE email = $1 OR username = $2`,
      [identifier, identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Tenants must be approved before they can log in
    if (user.role === 'tenant' && !user.is_approved) {
      return res.status(403).json({
        error: 'Your account is pending landlord approval. Check your email.',
      });
    }

    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({
        error: `This account is not a ${expectedRole} account.`,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ── Issue dual tokens ──
    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    const accessToken  = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set the refresh token as a secure HttpOnly cookie
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Login successful',
      data: {
        accessToken,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          phone_number: user.phone_number,
          role: user.role,
          is_approved: user.is_approved,
          hostel_name: user.hostel_name || null,
          hostel_address: user.hostel_address || null,
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

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN
// Reads the HttpOnly refresh token cookie, verifies it, and issues a new
// short-lived access token. The refresh token cookie itself is not rotated
// here (stateless approach) — add DB-based token rotation for higher security.
// ─────────────────────────────────────────────────────────────────────────────
const refreshToken = (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided. Please log in again.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      });
    } catch (verifyErr) {
      // Refresh token is invalid or expired — force re-login
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token expired or invalid. Please log in again.' });
    }

    // Build a clean payload — strip JWT metadata fields (iat, exp) before re-signing
    const newPayload = {
      user_id: decoded.user_id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };

    const newAccessToken = generateAccessToken(newPayload);

    return res.status(200).json({
      message: 'Token refreshed successfully.',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('[ERROR] Refresh token error:', error.message);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// Clears the HttpOnly refresh token cookie on the server side.
// The frontend is responsible for discarding the access token from memory/storage.
// ─────────────────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  clearRefreshCookie(res);
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE
// ─────────────────────────────────────────────────────────────────────────────
const profile = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ error: 'Unable to resolve user' });

    const result = await dbQuery(
      `SELECT user_id, username, full_name, email, phone_number, role,
              is_approved, hostel_name, hostel_address, landlord_code
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('[ERROR] Fetch profile error:', error.message);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// Uses COALESCE so only supplied fields are overwritten.
// Landlords can add/update hostel_name and hostel_address here.
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(400).json({ error: 'Unable to resolve user' });

    const { full_name, phone_number, hostel_name, hostel_address } = req.body;

    await dbQuery(
      `UPDATE users
       SET full_name      = COALESCE($1, full_name),
           phone_number   = COALESCE($2, phone_number),
           hostel_name    = COALESCE($3, hostel_name),
           hostel_address = COALESCE($4, hostel_address),
           updated_at     = NOW()
       WHERE user_id = $5`,
      [
        full_name || null,
        phone_number || null,
        hostel_name || null,
        hostel_address || null,
        userId,
      ]
    );

    const updatedResult = await dbQuery(
      `SELECT user_id, username, full_name, email, phone_number, role,
              is_approved, hostel_name, hostel_address
       FROM users WHERE user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedResult.rows[0],
    });
  } catch (error) {
    console.error('[ERROR] Update profile error:', error.message);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // NOTE: Always return the same 200 response regardless of whether the email
    // exists in the database. This prevents user-enumeration attacks (OWASP A07)
    // where an attacker can discover valid emails by observing different responses.
    const result = await dbQuery(
      'SELECT user_id, full_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      // Only generate and send OTP if the account actually exists — but the
      // caller (frontend) never learns whether the account exists or not.
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await dbQuery(
        'INSERT INTO password_resets (email, otp_code, is_used, expires_at) VALUES ($1, $2, $3, $4)',
        [email, otpCode, 0, expiresAt]
      );

      sendOTPEmail(email, otpCode)
        .catch((err) => console.error('[ERROR] Failed to send OTP email:', err.message));
    }

    // Return identical 200 for both found and not-found accounts (V5 fix)
    return res.status(200).json({ message: 'OTP sent to your registered email address' });
  } catch (error) {
    console.error('[ERROR] Forgot password error:', error.message);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp_code, otp, new_password, password } = req.body;
    const otpValue = otp_code || otp;
    const newPassword = new_password || password;

    if (!email || !otpValue || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }

    // Only need reset_id to mark as used — no wildcard
    const result = await dbQuery(
      `SELECT reset_id
       FROM password_resets
       WHERE email = $1 AND otp_code = $2 AND is_used = 0 AND expires_at > NOW()`,
      [email, otpValue]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        error: passwordCheck.errors[0],
        all_errors: passwordCheck.errors,
      });
    }

    const password_hash = await bcrypt.hash(newPassword, 12);

    await dbQuery('UPDATE users SET password_hash = $1 WHERE email = $2', [password_hash, email]);

    const otpRecord = result.rows[0];
    await dbQuery('UPDATE password_resets SET is_used = 1 WHERE reset_id = $1', [
      otpRecord.reset_id,
    ]);

    const userResult = await dbQuery('SELECT full_name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      sendPasswordChangedEmail(email, userResult.rows[0].full_name)
        .catch((err) =>
          console.error('[ERROR] Failed to send password changed email:', err.message)
        );
    }

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('[ERROR] Reset password error:', error.message);
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  profile,
  updateProfile,
};
