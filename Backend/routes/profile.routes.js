// routes/profile.routes.js
const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const { profile } = require('../controllers/auth.controller');

const router = express.Router();

router.get('/profile', verifyToken, profile);

module.exports = router;
