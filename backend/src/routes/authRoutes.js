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
  logoutAll,
  loginHistory,
  me,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  registerLimiter,
  loginIpLimiter,
  loginEmailLimiter,
  passwordResetLimiter,
  verifyEmailLimiter,
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
router.post('/verify-email/resend', verifyEmailLimiter, resendVerification);

// NEW (D3): session management
router.post('/logout-all', authenticate, logoutAll);
// NEW (D2): login history
router.get('/login-history', authenticate, loginHistory);

router.get('/me', authenticate, me);

module.exports = router;