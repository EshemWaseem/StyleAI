// routes/aiRoutes.js
const router = require('express').Router();
const multer = require('multer');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/trialCheck');
const { quotaCheck, incrementUsage } = require('../middleware/quotaCheck');
const { heavyLimiter } = require('../config/rateLimit');
const ctrl = require('../controllers/aiController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  '/product/content',
  authenticate,
  heavyLimiter,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  ctrl.generateContent,
);

router.post(
  '/product/:productId/content',
  authenticate,
  requirePermission('product.update'),
  heavyLimiter,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  ctrl.generateContentForProduct,
);

router.post(
  '/product/analyze-and-generate',
  authenticate,
  heavyLimiter,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  upload.single('image'),
  ctrl.analyzeAndGenerate,
);

router.post(
  '/content/platform',
  authenticate,
  heavyLimiter,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  ctrl.generatePlatformContent,
);

router.post(
  '/product/photography',
  authenticate,
  heavyLimiter,
  requireActiveSubscription,
  quotaCheck('aiImagePerMonth', 'aiImageCalls'),
  incrementUsage,
  upload.single('image'),
  ctrl.generatePhotography,
);

router.post(
  '/product/angles',
  authenticate,
  heavyLimiter,
  requireActiveSubscription,
  quotaCheck('aiImagePerMonth', 'aiImageCalls'),
  incrementUsage,
  upload.single('image'),
  ctrl.generateAngles,
);

router.post(
  '/product/variants',
  authenticate,
  heavyLimiter,
  upload.single('image'),
  ctrl.generateProductVariants,
);

module.exports = router;