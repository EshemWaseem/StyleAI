const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/campaignController');
const content = require('../controllers/contentPipelineController');
const chat = require('../controllers/campaignChatController');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.post('/:id/complete', ctrl.complete);

// ======================================================
// SHIPPING FLOW (Sprint B)
// ======================================================
router.post('/:id/address', ctrl.submitAddress);   // influencer
router.post('/:id/ship', ctrl.ship);               // brand
router.post('/:id/receive', ctrl.receive);         // influencer
router.post('/:id/deadline', ctrl.setDeadline);    // brand

// ======================================================
// CONTENT PIPELINE — deliverable-scoped
// ======================================================
router.post('/deliverables/:deliverableId/raw', content.submitRaw);
router.post('/deliverables/:deliverableId/edit', content.startEditing);
router.post('/deliverables/:deliverableId/final', content.submitFinal);
router.post('/deliverables/:deliverableId/approve', content.approve);
router.post('/deliverables/:deliverableId/reject', content.reject);
router.post('/deliverables/:deliverableId/publish', content.publish);
router.post('/deliverables/:deliverableId/metrics', content.metrics);

// ======================================================
// CHAT — campaign-scoped
// ======================================================
router.get('/:id/messages', chat.list);
router.post('/:id/messages', chat.send);
router.post('/:id/messages/read', chat.markRead);
router.post('/deliverables/:deliverableId/final-influencer', content.submitFinalAsInfluencer);
router.get('/:id/messages/unread', chat.unread);

module.exports = router;