// routes/influencerRoutes.js
const router = require('express').Router();
const {
  authenticate,
  requirePermission,
  requirePermissionOrRole,
  authorize,
} = require('../middleware/auth');
const ctrl = require('../controllers/influencerController');
const pricingCtrl = require('../controllers/pricingController');

router.use(authenticate);

// Roles that can browse creators (brand side + agency)
const BROWSE_ROLES = ['SUPER_ADMIN', 'BRAND_OWNER', 'AGENCY', 'BRAND_TEAM_MEMBER'];

// ----- Avatar upload -----
router.post(
  '/upload-avatar',
  requirePermission('influencer.create'),
  ctrl.avatarUpload.single('avatar'),
  ctrl.uploadAvatar
);

// ----- List (discover) — allow roles OR permission -----
router.get(
  '/',
  requirePermissionOrRole({
    permissions: ['influencer.read'],
    roles: BROWSE_ROLES,
  }),
  ctrl.list
);

// ----- My profile (influencer-only) -----
router.get('/me', requirePermission('influencer.read'), ctrl.getMe);

// ----- Pricing -----
router.get(
  '/:influencerId/pricing',
  requirePermissionOrRole({
    permissions: ['influencer.read'],
    roles: BROWSE_ROLES,
  }),
  pricingCtrl.getPricing
);
router.patch(
  '/:influencerId/pricing',
  requirePermission('influencer.update'),
  pricingCtrl.updatePricing
);

// ----- Create -----
router.post(
  '/',
  authorize('INFLUENCER', 'SUPER_ADMIN'),
  requirePermission('influencer.create'),
  ctrl.create
);

// ----- Detail -----
router.get(
  '/:idOrSlug',
  requirePermissionOrRole({
    permissions: ['influencer.read'],
    roles: BROWSE_ROLES,
  }),
  ctrl.getOne
);

// ----- Update -----
router.patch('/:influencerId', requirePermission('influencer.update'), ctrl.update);

// ----- Archive -----
router.delete('/:influencerId', requirePermission('influencer.delete'), ctrl.remove);

// ----- Save / unsave -----
router.post(
  '/:influencerId/save',
  requirePermissionOrRole({
    permissions: ['influencer.save'],
    roles: BROWSE_ROLES,
  }),
  ctrl.save
);
router.delete(
  '/:influencerId/save',
  requirePermissionOrRole({
    permissions: ['influencer.save'],
    roles: BROWSE_ROLES,
  }),
  ctrl.unsave
);

module.exports = router;