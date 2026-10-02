// routes/offerRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/offerController');

router.use(authenticate);

// ----- Estimate (dry-run, no save) -----
router.post('/estimate', ctrl.estimate);

// ----- List + create -----
router.get('/', ctrl.list);
router.post('/', ctrl.create);

// ----- Single offer -----
router.get('/:offerId', ctrl.getOne);
router.patch('/:offerId', ctrl.update);

// ----- State transitions -----
router.post('/:offerId/submit', ctrl.submit);
router.post('/:offerId/cancel', ctrl.cancel);
router.post('/:offerId/admin-review', ctrl.adminReview);
router.post('/:offerId/influencer-review', ctrl.influencerReview);

module.exports = router;