// routes/influencerRoutes.js
const router = require('express').Router();
const { authenticate, requirePermission, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/influencerController');
const pricingCtrl = require('../controllers/pricingController');

router.use(authenticate);

// ----- Avatar upload (any authenticated user with influencer.create) -----
router.post(
  '/upload-avatar',
  requirePermission('influencer.create'),
  ctrl.avatarUpload.single('avatar'),
  ctrl.uploadAvatar
);

// ----- List (discover) -----
router.get('/', requirePermission('influencer.read'), ctrl.list);

// ----- My profile (MUST come before /:idOrSlug) -----
router.get('/me', requirePermission('influencer.read'), ctrl.getMe);

// ----- Pricing (must come before /:idOrSlug) -----
router.get(
  '/:influencerId/pricing',
  requirePermission('influencer.read'),
  pricingCtrl.getPricing
);
router.patch(
  '/:influencerId/pricing',
  requirePermission('influencer.update'),
  pricingCtrl.updatePricing
);

// ======================================================
// CREATE — STRICT ROLE GUARD
// Only INFLUENCER role (or SUPER_ADMIN) can create.
// Service layer ALSO enforces this — defense in depth.
// ======================================================
router.post(
  '/',
  authorize('INFLUENCER', 'SUPER_ADMIN'),
  requirePermission('influencer.create'),
  ctrl.create
);

// ----- Detail -----
router.get('/:idOrSlug', requirePermission('influencer.read'), ctrl.getOne);

// ----- Update -----
router.patch('/:influencerId', requirePermission('influencer.update'), ctrl.update);

// ----- Archive -----
router.delete('/:influencerId', requirePermission('influencer.delete'), ctrl.remove);

// ----- Save / unsave -----
router.post('/:influencerId/save', requirePermission('influencer.save'), ctrl.save);
router.delete('/:influencerId/save', requirePermission('influencer.save'), ctrl.unsave);

module.exports = router;