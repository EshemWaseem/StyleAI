const router = require('express').Router();
const multer = require('multer');
const { authenticate, requirePermission } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// In-memory upload — file is forwarded to FastAPI, not written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ======================================================
// POST /api/ai/product/content
// Generate e-commerce content from verified attributes.
// Does NOT save — caller decides what to do with the result.
// ======================================================
router.post(
  '/product/content',
  authenticate,
  aiController.generateContent
);

// ======================================================
// POST /api/ai/product/:productId/content
// Generate content FROM a product's attributes and
// save the result to Product.aiContent.
// ======================================================
router.post(
  '/product/:productId/content',
  authenticate,
  requirePermission('product.update'),
  aiController.generateContentForProduct
);

// ======================================================
// POST /api/ai/product/analyze-and-generate
// Multipart image → analyze → generate content.
// Returns { attributes, content }.
// ======================================================
router.post(
  '/product/analyze-and-generate',
  authenticate,
  upload.single('image'),
  aiController.analyzeAndGenerate
);

module.exports = router;










// const router = require('express').Router();
// const { authenticate, requirePermission } = require('../middleware/auth');

// const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
// const FASTAPI_TIMEOUT = Number(process.env.FASTAPI_TIMEOUT || 15000);

// // Generic proxy helper — reusable, has timeout + error handling
// async function callFastAPI(path, { method = 'GET', body, user } = {}) {
//   const controller = new AbortController();
//   const timer = setTimeout(() => controller.abort(), FASTAPI_TIMEOUT);

//   try {
//     const res = await fetch(`${FASTAPI_URL}${path}`, {
//       method,
//       headers: {
//         'Content-Type': 'application/json',
//         'X-User-Id': user?.id || '',
//         'X-User-Roles': (user?.roles || []).join(','),
//         'X-Internal-Key': process.env.INTERNAL_KEY || 'dev-internal-key',
//       },
//       body: body ? JSON.stringify(body) : undefined,
//       signal: controller.signal,
//     });

//     if (!res.ok) {
//       const text = await res.text().catch(() => '');
//       throw Object.assign(
//         new Error(`FastAPI ${res.status}: ${text || res.statusText}`),
//         { status: 502 }
//       );
//     }
//     return res.json();
//   } catch (err) {
//     if (err.name === 'AbortError') {
//       throw Object.assign(new Error('FastAPI timeout'), { status: 504 });
//     }
//     throw err;
//   } finally {
//     clearTimeout(timer);
//   }
// }

// // GET /api/ai/analyze  → public (keep as-is for now, no auth)
// router.get('/analyze', async (req, res, next) => {
//   try {
//     const data = await callFastAPI('/analyze', { user: req.user });
//     res.json({ source: 'Node.js', aiAnalysis: data });
//   } catch (err) {
//     next(err);
//   }
// });

// // POST /api/ai/analyze-protected  → requires auth + permission
// // Example of a protected AI endpoint (RBAC in action)
// router.post(
//   '/analyze-protected',
//   authenticate,
//   requirePermission('product.read'),
//   async (req, res, next) => {
//     try {
//       const data = await callFastAPI('/analyze', {
//         method: 'POST',
//         body: req.body,
//         user: req.user,
//       });
//       res.json({ source: 'Node.js (protected)', aiAnalysis: data });
//     } catch (err) {
//       next(err);
//     }
//   }
// );

// module.exports = router;