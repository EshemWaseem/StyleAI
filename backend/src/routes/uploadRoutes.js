const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/uploadController');

router.use(authenticate);

router.post(
  '/campaigns/:campaignId/:deliverableId',
  ctrl.upload.array('files', 10),
  ctrl.uploadCampaignFiles
);

module.exports = router;