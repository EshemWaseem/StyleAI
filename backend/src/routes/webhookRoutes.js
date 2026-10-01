// routes/webhookRoutes.js
const express = require('express');
const ctrl = require('../controllers/webhookController');

const router = express.Router();

// Stripe needs RAW body — mounted BEFORE express.json() in server.js
router.post('/stripe', express.raw({ type: 'application/json' }), ctrl.stripeWebhook);

// JazzCash / Easypaisa POST back as form-urlencoded
router.post('/jazzcash', express.urlencoded({ extended: false }), ctrl.jazzcashWebhook);
router.post('/easypaisa', express.urlencoded({ extended: false }), ctrl.easypaisaWebhook);

module.exports = router;