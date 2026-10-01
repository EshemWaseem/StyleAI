const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/analyticsController');

router.use(authenticate);

router.get('/platform', authorize('SUPER_ADMIN'), ctrl.platform);
router.get('/brand', ctrl.brand);
router.get('/agency', ctrl.agency);
router.get('/influencer', ctrl.influencer);

module.exports = router;