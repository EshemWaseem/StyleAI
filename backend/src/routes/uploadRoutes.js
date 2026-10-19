const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { heavyLimiter } = require('../config/rateLimit');
const ctrl = require('../controllers/uploadController');

router.use(authenticate);

router.post(
  '/campaigns/:campaignId/:deliverableId',
  heavyLimiter,
  ctrl.upload.array('files', 10),
  ctrl.uploadCampaignFiles
);

module.exports = router;