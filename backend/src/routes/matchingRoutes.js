// routes/matchingRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/matchingController');

router.use(authenticate);

router.get('/products/:productId', ctrl.forProduct);
router.get('/me/products', ctrl.forMe);

module.exports = router;