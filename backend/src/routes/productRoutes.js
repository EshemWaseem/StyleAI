// backend/src/routes/productRoutes.js
const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const ctrl = require('../controllers/productController');


//  PUBLIC ROUTES (No Auth Required)

router.get('/public', ctrl.listPublic);
router.get('/public/brands', ctrl.listPublicBrands);
router.get('/public/:id', ctrl.getOne); // 🆕 Added public single product route


//  AUTH REQUIRED ROUTES

router.use(authenticate);

// Read
router.get('/', requirePermission('product.read'), ctrl.list);
router.get('/:productId', requirePermission('product.read'), ctrl.getOne);

// Create (full edit)
router.post('/', requirePermission('product.create'), handleUpload, ctrl.create);

// Update inventory ONLY
router.patch(
  '/:productId/inventory',
  requirePermission('inventory.manage'),
  ctrl.updateInventory
);

// Full update
router.patch(
  '/:productId',
  requirePermission('product.update'),
  handleUpload,
  ctrl.update
);

// Delete
router.delete('/:productId', requirePermission('product.delete'), ctrl.remove);

module.exports = router;