// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import the DB module so it executes its connection test on startup
require('./config/db');

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Mount Paystack webhook with raw body parser specifically
const paymentController = require('./controllers/payment.controller');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.paystackWebhook);

// Parse JSON for all other routes
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/announcement', require('./routes/announcement.routes'));
app.use('/api/approval', require('./routes/approval.routes'));
app.use('/api/lease', require('./routes/lease.routes'));
app.use('/api/notification', require('./routes/notification.routes'));
app.use('/api/property', require('./routes/property.routes'));
app.use('/api/pwa', require('./routes/pwa.routes'));
app.use('/api/room', require('./routes/room.routes'));

// Health and root
app.get('/api/health', (req, res) => res.status(200).json({ status: 'UP', app: 'ProTech' }));
app.get('/', (req, res) => res.status(200).json({ message: 'Welcome to the ProTech API!', status: 'Running smoothly 🚀' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

