// routes/listingRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { resolveActingBrand } = require('../middleware/actingBrand');
const ctrl = require('../controllers/listingController');

router.use(authenticate);
router.use(resolveActingBrand);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.post('/:id/cancel', ctrl.cancel);
router.post('/:id/claim', ctrl.claim);

module.exports = router;