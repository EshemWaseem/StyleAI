// routes/brandRoutes.js
const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { resolveActingBrand } = require('../middleware/actingBrand');
const ctrl = require('../controllers/brandController');

router.get('/public', ctrl.listPublicBrands);
router.get('/:brandId/public-roles', ctrl.getPublicBrandRoles);

router.use(authenticate);
router.use(resolveActingBrand);

router.get('/', requirePermission('brand.read'), ctrl.list);
router.get('/:brandId', requirePermission('brand.read'), ctrl.getOne);
router.post('/', requirePermission('brand.create'), ctrl.create);
router.patch('/:brandId', requirePermission('brand.update'), ctrl.update);
router.delete('/:brandId', requirePermission('brand.delete'), ctrl.remove);

module.exports = router;