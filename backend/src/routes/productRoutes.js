const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const ctrl = require('../controllers/productController');

// ======================================================
// PUBLIC — before authenticate
// ======================================================
router.get('/public', ctrl.listPublic);
router.get('/public/brands', ctrl.listPublicBrands);

// ======================================================
// AUTH required
// ======================================================
router.use(authenticate);

// Read
router.get('/', requirePermission('product.read'), ctrl.list);
router.get('/:productId', requirePermission('product.read'), ctrl.getOne);

// Create (full edit)
router.post('/', requirePermission('product.create'), handleUpload, ctrl.create);

// Update inventory ONLY — restricted to inventory managers
// ⚠️ MUST be BEFORE /:productId to avoid collision
router.patch(
  '/:productId/inventory',
  requirePermission('inventory.manage'),
  ctrl.updateInventory
);

// Full update — product managers only
router.patch(
  '/:productId',
  requirePermission('product.update'),
  handleUpload,
  ctrl.update
);

// Delete
router.delete('/:productId', requirePermission('product.delete'), ctrl.remove);

module.exports = router;