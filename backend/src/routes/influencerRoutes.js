// routes/influencerRoutes.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  authenticate,
  requirePermission,
  requirePermissionOrRole,
  authorize,
} = require('../middleware/auth');
const ctrl = require('../controllers/influencerController');
const pricingCtrl = require('../controllers/pricingController');

// ✅ Use centralized Redis store + IPv6-safe key generator
const { makeStore, ipKeyGenerator } = require('../config/rateLimit');

router.use(authenticate);

// Roles that can browse creators (brand side + agency)
const BROWSE_ROLES = ['SUPER_ADMIN', 'BRAND_OWNER', 'AGENCY', 'BRAND_TEAM_MEMBER'];

//       
// Rate limiter for Apify scrape — protects credits
// 10 verifications per user per hour
//       
const scrapeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('influencer-scrape'), // ✅ Redis-backed + unique prefix
  keyGenerator: (req) =>
    req.user?.id
      ? `u:${req.user.id}`
      : `ip:${ipKeyGenerator(req.ip)}`, // ✅ IPv6-safe
  message: {
    message: 'Too many profile verifications. Please try again later.',
    code: 'SCRAPE_RATE_LIMIT',
  },
});

//   Avatar upload  
router.post(
  '/upload-avatar',
  requirePermission('influencer.create'),
  ctrl.avatarUpload.single('avatar'),
  ctrl.uploadAvatar
);

//   Scrape social profile (Apify) — rate limited  
// ✅ FIX: Allowed BRAND_OWNER and BRAND_TEAM_MEMBER to use this route
router.post(
  '/scrape-social',
  scrapeLimiter,
  requirePermissionOrRole({
    permissions: ['influencer.create'],
    roles: ['INFLUENCER', 'BRAND_OWNER', 'BRAND_TEAM_MEMBER', 'SUPER_ADMIN']
  }),
  ctrl.scrapeProfile
);

//   List (discover) — allow roles OR permission  
router.get(
  '/',
  requirePermissionOrRole({
    permissions: ['influencer.read'],
    roles: BROWSE_ROLES,
  }),
  ctrl.list
);

//   My profile (influencer-only)  
router.get('/me', requirePermission('influencer.read'), ctrl.getMe);

//   Pricing  
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

//   Create  
router.post(
  '/',
  authorize('INFLUENCER', 'SUPER_ADMIN'),
  requirePermission('influencer.create'),
  ctrl.create
);

//   Detail  
router.get(
  '/:idOrSlug',
  requirePermissionOrRole({
    permissions: ['influencer.read'],
    roles: BROWSE_ROLES,
  }),
  ctrl.getOne
);

//  Update 
router.patch('/:influencerId', requirePermission('influencer.update'), ctrl.update);

// Archive 
router.delete('/:influencerId', requirePermission('influencer.delete'), ctrl.remove);


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