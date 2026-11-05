const router = require('express').Router();
const ctrl = require('../controllers/journalController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.get('/', ctrl.listStories);

// Admin only routes
router.post('/', authenticate, authorize('SUPER_ADMIN'), ctrl.createStory);
router.patch('/:id', authenticate, authorize('SUPER_ADMIN'), ctrl.updateStory);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), ctrl.deleteStory);

module.exports = router;