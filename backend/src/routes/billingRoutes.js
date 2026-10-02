// routes/billingRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/billingController');

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.get('/plans', ctrl.getPlans);
router.post('/cancel', ctrl.cancel);
router.post('/resume', ctrl.resume);

// Invoice management
router.delete('/invoices', ctrl.deleteAllFailed);     // bulk
router.delete('/invoices/:id', ctrl.deleteInvoice);   // single

module.exports = router;