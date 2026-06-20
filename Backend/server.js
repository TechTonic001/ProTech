// server.js
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import the DB module so it executes its connection test on startup
require('./config/db');

// Start notifications cron scheduler
const { startNotificationCron } = require('./jobs/notificationCron');
startNotificationCron();

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    // Dynamic origin matching to support credentials and completely avoid CORS issues on deployments
    callback(null, true);
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
app.get('/', (req, res) => res.status(200).json({ message: 'Welcome to the ProTech API!', status: 'Running smoothly 🚀' }));

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

// Port configuration set automatically by Vercel or defaulting to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express app for Vercel's serverless runtime
module.exports = app;
