// routes/recommendationsRoutes.js
// ======================================================
// Recommendations routes
// ======================================================

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/recommendationsController');

router.use(authenticate);

router.get('/', ctrl.list);

module.exports = router;