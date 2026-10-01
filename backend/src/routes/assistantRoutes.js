const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/assistantController');

router.use(authenticate);

router.post('/chat', ctrl.chat);
router.get('/conversations', ctrl.list);
router.get('/conversations/:id', ctrl.getOne);
router.delete('/conversations/:id', ctrl.remove);

module.exports = router;