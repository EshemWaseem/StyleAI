// routes/walletRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/walletController');

router.use(authenticate);

// ----- Owner-facing -----
router.get('/me', ctrl.getMe);
router.get('/me/transactions', ctrl.listTransactions);
router.post('/me/topup', ctrl.topUp);              // NEW
router.post('/me/withdraw', ctrl.requestWithdrawal);

// ----- Admin-only -----
router.get('/admin/stats', authorize('SUPER_ADMIN'), ctrl.getStats);
router.get('/admin/wallets', authorize('SUPER_ADMIN'), ctrl.listAll);
router.get('/withdrawals', authorize('SUPER_ADMIN'), ctrl.listWithdrawals);
router.post('/withdrawals/:txnId/review', authorize('SUPER_ADMIN'), ctrl.reviewWithdrawal);

module.exports = router;