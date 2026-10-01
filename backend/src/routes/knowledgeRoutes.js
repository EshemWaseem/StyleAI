const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/knowledgeController');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/stats', ctrl.stats);
router.get('/search', ctrl.search);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/:id/reindex', ctrl.reindex);
router.delete('/:id', ctrl.remove);

module.exports = router;