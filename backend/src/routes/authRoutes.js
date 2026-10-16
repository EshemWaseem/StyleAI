// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  registerLimiter,
  loginIpLimiter,
  loginEmailLimiter,
} = require('../config/rateLimit');

// Register — strict per-IP
router.post('/register', registerLimiter, register);

// Login — two layers (per IP + per email)
router.post('/login', loginIpLimiter, loginEmailLimiter, login);

// Current user
router.get('/me', authenticate, me);

module.exports = router;