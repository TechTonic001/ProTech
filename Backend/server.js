// server.js
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
});

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

console.log('═══════════════════════════════════');
console.log('[STARTUP CONFIG CHECK]');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
// console.log(
//   'DATABASE_URL host:',
//   process.env.DATABASE_URL
//     ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0]
//     : 'MISSING'
// );
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_REFRESH_SECRET exists:', !!process.env.JWT_REFRESH_SECRET);
console.log('═══════════════════════════════════');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/db');

// Start notifications cron scheduler
const { startNotificationCron } = require('./jobs/notificationCron');
startNotificationCron();

const app = express();

app.use(helmet());

const normalizeOrigin = (value = '') => {
  const trimmed = value.trim();
  return trimmed.replace(/\/+$/, '');
};

const readCorsOrigins = () => {
  const defaults = [
    'https://pro-tech-one.vercel.app',
    'https://www.pro-tech-one.vercel.app',
  ];

  if (process.env.NODE_ENV !== 'production') {
    defaults.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173');
  }

  const extraOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  return Array.from(new Set([...defaults.map(normalizeOrigin), ...extraOrigins]));
};

const allowedOrigins = new Set(readCorsOrigins());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'localhost' || hostname === '127.0.0.1') return callback(null, true);
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) return callback(null, true);
      } catch (_) { /* invalid origin */ }
    }

    console.warn('[CORS BLOCKED]', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parse cookies — required to read the HttpOnly refresh token cookie
app.use(cookieParser());

// ── Auth rate limiter: max 20 login/register attempts per IP per 15 minutes (V7)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
  skip: () => process.env.NODE_ENV !== 'production',
});

// ── Stricter limiter for forgot-password: max 5 OTP requests per IP per hour (V7)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  skip: () => process.env.NODE_ENV !== 'production',
});

// Mount Paystack webhook with raw body parser specifically
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/payment.webhook.routes')
);


app.use(express.json());

// Routes
app.use('/api', require('./routes/test.routes'));
// Apply stricter forgot-password limiter BEFORE the broader auth limiter (order matters)
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/announcement', require('./routes/announcement.routes'));
app.use('/api/approval', require('./routes/approval.routes'));
app.use('/api/lease', require('./routes/lease.routes'));
app.use('/api/notification', require('./routes/notification.routes'));
app.use('/api/property', require('./routes/property.routes'));
app.use('/api/pwa', require('./routes/pwa.routes'));
app.use('/api/room', require('./routes/room.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Health and root
app.get('/api/health', (req, res) => res.status(200).json({ status: 'UP', app: 'ProTech' }));
app.get('/', (req, res) => res.status(200).json({ status: 'ok' }));

// Catch-all: any route not matched above gets a proper JSON 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.originalUrl} does not exist.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err.message);
  console.error(err.stack);
  if (res.headersSent) return next(err);
  return res.status(500).json({
    error: 'Internal server error. Please try again.'
  });
});

const seedAdmin = require('./config/seedAdmin');

// Only start HTTP server when running locally (not on Vercel serverless)
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, async () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    await testConnection();
    await seedAdmin();
  });
} else {
  // Serverless: run DB check + seed once on cold start without binding a port
  testConnection().catch(console.error);
  seedAdmin().catch(console.error);
}

// Export the Express app for Vercel's serverless runtime
module.exports = app;
