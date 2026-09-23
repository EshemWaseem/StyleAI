const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/brandController');

// ======================================================
// PUBLIC — must be BEFORE authenticate
// ======================================================
router.get('/public', ctrl.listPublicBrands);
router.get('/:brandId/public-roles', ctrl.getPublicBrandRoles); 
// ======================================================
// AUTH required
// ======================================================
router.use(authenticate);

router.get('/', requirePermission('brand.read'), ctrl.list);
router.get('/:brandId', requirePermission('brand.read'), ctrl.getOne);
router.post('/', requirePermission('brand.create'), ctrl.create);
router.patch('/:brandId', requirePermission('brand.update'), ctrl.update);
router.delete('/:brandId', requirePermission('brand.delete'), ctrl.remove);

module.exports = router;