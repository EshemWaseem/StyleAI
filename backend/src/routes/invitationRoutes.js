const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/invitationController');

// ======================================================
// PUBLIC — token lookup (no auth)
// ======================================================
router.get('/token/:token', ctrl.getByToken);

// ======================================================
// AUTHENTICATED
// ======================================================
router.use(authenticate);

// For current user (received invitations)
router.get('/received', ctrl.listReceived);
router.post('/redeem', ctrl.redeem);

// For owner (sent invitations)
router.post('/', ctrl.create);
router.get('/sent', ctrl.listSent);
router.delete('/:id', ctrl.cancel);

// Accept / decline by token
router.post('/token/:token/accept', ctrl.accept);
router.post('/token/:token/decline', ctrl.decline);

module.exports = router;