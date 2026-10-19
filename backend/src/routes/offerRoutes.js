// routes/offerRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { resolveActingBrand } = require('../middleware/actingBrand');
const ctrl = require('../controllers/offerController');

router.use(authenticate);
router.use(resolveActingBrand);

router.post('/estimate', ctrl.estimate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);

router.get('/:offerId', ctrl.getOne);
router.patch('/:offerId', ctrl.update);

router.post('/:offerId/submit', ctrl.submit);
router.post('/:offerId/cancel', ctrl.cancel);
router.post('/:offerId/admin-review', ctrl.adminReview);
router.post('/:offerId/influencer-review', ctrl.influencerReview);

module.exports = router;