// server.js
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
});

require('dotenv').config();

console.log('═══════════════════════════════════');
console.log('[STARTUP CONFIG CHECK]');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log(
  'DATABASE_URL host:',
  process.env.DATABASE_URL
    ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0]
    : 'MISSING'
);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('═══════════════════════════════════');

const express = require('express');
const cors = require('cors');

const { testConnection } = require('./config/db');

// Start notifications cron scheduler
const { startNotificationCron } = require('./jobs/notificationCron');
startNotificationCron();

const app = express();

const allowedOrigins = [
  'https://pro-tech-one.vercel.app',
  // 'https://protech-ruddy.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests like Postman (no origin)
    if (!origin) return callback(null, true);

    // Allow explicit whitelisted origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow any localhost origin (any port) for developer convenience
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return callback(null, true);
      }

      // Allow private LAN IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
      const host = url.hostname;
      if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
        return callback(null, true);
      }
    } catch (e) {
      // fall through to block
    }

    console.error('[CORS BLOCKED]', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Mount Paystack webhook with raw body parser specifically
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/payment.webhook.routes')
);

// Parse JSON for all other routes
app.use(express.json());

// Routes
app.use('/api', require('./routes/test.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
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
app.get('/', (req, res) => res.status(200).json({ message: 'ProTech API is running', status: 'OK' }));

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

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  await testConnection();
  await seedAdmin();
});

// Export the Express app for Vercel's serverless runtime
module.exports = app;
