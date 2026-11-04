// backend/src/routes/courierRoutes.js
const router = require('express').Router();
const ctrl = require('../controllers/courierController');

// Webhook Endpoint (Public)
router.post('/webhook', ctrl.handleCourierWebhook);

module.exports = router;