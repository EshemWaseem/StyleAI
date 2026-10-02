// routes/aiRoutes.js
const router = require('express').Router();
const multer = require('multer');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/trialCheck');
const { quotaCheck, incrementUsage } = require('../middleware/quotaCheck');
const ctrl = require('../controllers/aiController');

// In-memory upload — forwarded to FastAPI, not written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ======================================================
// PRODUCT CONTENT (text AI — counts aiTextPerMonth)
// ======================================================

// POST /api/ai/product/content
// Generate from verified attributes — does NOT save
router.post(
  '/product/content',
  authenticate,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  ctrl.generateContent,
);

// POST /api/ai/product/:productId/content
// Generate and save to Product.aiContent
router.post(
  '/product/:productId/content',
  authenticate,
  requirePermission('product.update'),
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  ctrl.generateContentForProduct,
);

// POST /api/ai/product/analyze-and-generate
// Multipart image → vision + text → attributes + content
router.post(
  '/product/analyze-and-generate',
  authenticate,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  upload.single('image'),
  ctrl.analyzeAndGenerate,
);

// ======================================================
// PLATFORM CONTENT (text AI — counts aiTextPerMonth)
// ======================================================

// POST /api/ai/content/platform
// Body: { platform, productId?, product_name?, tone?, brand_voice? }
router.post(
  '/content/platform',
  authenticate,
  requireActiveSubscription,
  quotaCheck('aiTextPerMonth', 'aiTextCalls'),
  incrementUsage,
  ctrl.generatePlatformContent,
);

// ======================================================
// IMAGE AI (counts aiImagePerMonth)
// ======================================================

// POST /api/ai/product/photography
// Multipart image → AI scene + QA → Cloudinary URL
router.post(
  '/product/photography',
  authenticate,
  requireActiveSubscription,
  quotaCheck('aiImagePerMonth', 'aiImageCalls'),
  incrementUsage,
  upload.single('image'),
  ctrl.generatePhotography,
);

// POST /api/ai/product/angles
// Multipart image → AI angles → Cloudinary URLs
// Note: angles is image generation, counts too
router.post(
  '/product/angles',
  authenticate,
  requireActiveSubscription,
  quotaCheck('aiImagePerMonth', 'aiImageCalls'),
  incrementUsage,
  upload.single('image'),
  ctrl.generateAngles,
);

// ======================================================
// PRODUCT VARIANTS (PIL-based, no AI quota)
// ======================================================

// POST /api/ai/product/variants
// Multipart image → 3 PIL variants → Cloudinary URLs
router.post(
  '/product/variants',
  authenticate,
  upload.single('image'),
  ctrl.generateProductVariants,
);

module.exports = router;