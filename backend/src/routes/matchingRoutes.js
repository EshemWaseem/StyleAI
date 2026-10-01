// routes/matchingRoutes.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/matchingController');

router.use(authenticate);

// For brand/agency: recommend influencers for a product
router.get('/products/:productId', ctrl.forProduct);

// For influencer: recommend products matching my profile
router.get('/me/products', ctrl.forMe);

module.exports = router;