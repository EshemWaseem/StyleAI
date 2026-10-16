// routes/paymentRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

// All payment routes require authentication
router.use(authenticate);

// GET /api/payments/methods/:context
// Returns allowed providers for a given context (SUBSCRIPTION, ORDER, WALLET_TOPUP)
router.get('/methods/:context', ctrl.getMethods);

// POST /api/payments/subscription/checkout
router.post('/subscription/checkout', ctrl.subscriptionCheckout);

// POST /api/payments/subscription/verify-session
// Fallback for when webhook doesn't arrive (local dev, or public URL issues)
router.post('/subscription/verify-session', ctrl.verifySession);

// POST /api/payments/order/checkout
router.post('/order/checkout', ctrl.orderCheckout);

// POST /api/payments/order/cod/confirm
router.post('/order/cod/confirm', ctrl.confirmCod);

// POST /api/payments/portal
router.post('/portal', ctrl.createPortal);

module.exports = router;