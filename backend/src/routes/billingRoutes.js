// routes/billingRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/billingController');

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.get('/plans', ctrl.getPlans);   // optional ?role=BRAND
router.post('/cancel', ctrl.cancel);
router.post('/resume', ctrl.resume);

module.exports = router;