// routes/catalogRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/catalogController');

router.use(authenticate);

router.get('/platforms', ctrl.listPlatforms);
router.get('/platforms/:platform/content-types', ctrl.listContentTypes);

module.exports = router;