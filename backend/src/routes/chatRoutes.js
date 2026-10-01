const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/chatController');

router.use(authenticate);
router.get('/parties', ctrl.searchParties);
router.get('/conversations', ctrl.listConversations);
router.get('/conversations/unread-count', ctrl.unread);
router.post('/conversations/with', ctrl.openWith);            // ← generic
router.get('/conversations/:id', ctrl.getOne);
router.get('/conversations/:id/messages', ctrl.listMessages);
router.post('/conversations/:id/messages', ctrl.sendMessage);
router.post('/conversations/:id/read', ctrl.markRead);

module.exports = router;