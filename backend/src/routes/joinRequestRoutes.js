const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/joinRequestController');

router.use(authenticate);

// Send new request (any logged-in user)
router.post('/', ctrl.create);

// Own requests (any user)
router.get('/mine', ctrl.listMine);
router.delete('/mine/:id', ctrl.cancelMine);

// Brand owner views + reviews
router.get('/pending', ctrl.listPending);
router.patch('/:id/approve', ctrl.approve);
router.patch('/:id/reject', ctrl.reject);

module.exports = router;