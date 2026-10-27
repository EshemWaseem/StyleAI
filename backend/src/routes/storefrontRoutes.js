// backend/src/routes/storefrontRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/storefrontController');

// Public — no auth required
router.get('/', ctrl.getPublicStorefront);

// Everything below this line requires authentication
router.use(authenticate);

// Everything below this line requires a brand-level role
router.use(authorize('BRAND_OWNER', 'BRAND_TEAM_MEMBER'));

router.get('/me/status', ctrl.getMyStatus);
router.post('/me/apply', ctrl.apply);
router.post('/me/withdraw', ctrl.withdraw);
router.patch('/me/products/:productId/visibility', ctrl.toggleProductVisibility);

module.exports = router;