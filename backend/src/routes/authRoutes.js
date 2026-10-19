// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
  me,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  registerLimiter,
  loginIpLimiter,
  loginEmailLimiter,
  passwordResetLimiter,
} = require('../config/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/login', loginIpLimiter, loginEmailLimiter, login);

// Password reset
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

// Password change (authenticated)
router.post('/change-password', authenticate, changePassword);

// Email verification
router.post('/verify-email', verifyEmail);
// Resend — reuse strict email-keyed limiter (3/hour per email)
router.post('/verify-email/resend', passwordResetLimiter, resendVerification);

router.get('/me', authenticate, me);

module.exports = router;