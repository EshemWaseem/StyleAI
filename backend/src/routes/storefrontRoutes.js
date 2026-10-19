// routes/storefrontRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/storefrontController');

// PUBLIC
router.get('/', ctrl.getPublicStorefront);

// BRAND SIDE — application flow
router.get('/me/status', authenticate, ctrl.getMyStatus);
router.post('/me/apply', authenticate, ctrl.apply);
router.post('/me/withdraw', authenticate, ctrl.withdraw);

// BRAND SIDE — per-product visibility (own products only)
router.patch(
  '/me/products/:productId/visibility',
  authenticate,
  ctrl.toggleProductVisibility
);

module.exports = router;