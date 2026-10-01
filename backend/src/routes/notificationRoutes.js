// routes/notificationRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authenticateSSE } = require('../middleware/authSSE');
const ctrl = require('../controllers/notificationController');

// SSE endpoint — token comes via query string (EventSource limitation)
router.get('/stream', authenticateSSE, ctrl.stream);

// Everything else uses normal bearer auth
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.post('/:id/read', ctrl.markRead);
router.post('/read-all', ctrl.markAllRead);
router.delete('/:id', ctrl.remove);

module.exports = router;