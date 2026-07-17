// utils/tokenUtils.js
// Central utility for dual-token (Access + Refresh) JWT management.
// Keep all token/cookie logic here — never scatter jwt.sign() calls across controllers.

const jwt = require('jsonwebtoken');

// ── Sanity-check required env vars at module load time ──────────────────────
if (!process.env.JWT_SECRET) {
  throw new Error('[tokenUtils] JWT_SECRET is not defined in environment variables.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('[tokenUtils] JWT_REFRESH_SECRET is not defined in environment variables.');
}

const ACCESS_TOKEN_EXPIRY  = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ────────────────────────────────────────────────────────────────────────────
// generateAccessToken
// Short-lived (15m) token signed with JWT_SECRET.
// Payload: { user_id, email, username, role }
// ────────────────────────────────────────────────────────────────────────────
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// generateRefreshToken
// Long-lived (7d) token signed with a SEPARATE JWT_REFRESH_SECRET.
// Using a distinct secret means a compromised access token secret cannot be
// used to forge a refresh token, and vice-versa.
// ────────────────────────────────────────────────────────────────────────────
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// setRefreshCookie
// Attaches the refresh token as an HttpOnly, Secure, SameSite=Strict cookie.
//
// Security properties:
//  HttpOnly  — JavaScript (including XSS payloads) cannot read this cookie.
//  Secure    — Only sent over HTTPS. Omitted in development so localhost works.
//  SameSite=Strict — Cookie is never sent on cross-site navigations, preventing CSRF.
//  maxAge    — 7 days in milliseconds.
// ────────────────────────────────────────────────────────────────────────────
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod; plain HTTP allowed in dev
    sameSite: 'Strict',
    maxAge: SEVEN_DAYS_MS,
    path: '/', // cookie sent on all routes so /api/auth/refresh can read it
  });
};

// ────────────────────────────────────────────────────────────────────────────
// clearRefreshCookie
// Instructs the browser to expire the refresh token cookie immediately.
// Must use the same options (path, sameSite, secure) as setRefreshCookie,
// otherwise the browser treats them as different cookies and ignores the clear.
// ────────────────────────────────────────────────────────────────────────────
const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};
