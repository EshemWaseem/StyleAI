// routes/paymentRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.use(authenticate);

router.get('/methods/:context', ctrl.getMethods);
router.post('/subscription/checkout', ctrl.subscriptionCheckout);
router.post('/order/checkout', ctrl.orderCheckout);
router.post('/order/cod/confirm', ctrl.confirmCod);
router.post('/portal', ctrl.createPortal);

module.exports = router;