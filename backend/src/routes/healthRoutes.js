// routes/healthRoutes.js
const express = require('express');
const { liveness, readiness } = require('../controllers/healthController');

const router = express.Router();

router.get('/', liveness);
router.get('/ready', readiness);

module.exports = router;