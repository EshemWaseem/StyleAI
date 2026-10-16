// routes/teamRoutes.js
const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { resolveActingBrand } = require('../middleware/actingBrand');
const ctrl = require('../controllers/teamController');

router.use(authenticate);
router.use(resolveActingBrand); // ✅ agency X-Acting-Brand support

router.get('/',    requirePermission('team.read'),   ctrl.list);
router.get('/:teamId', requirePermission('team.read'),   ctrl.getOne);
router.post('/',   requirePermission('team.create'), ctrl.create);
router.patch('/:teamId', requirePermission('team.update'), ctrl.update);
router.delete('/:teamId', requirePermission('team.delete'), ctrl.remove);

// Members
router.get('/:teamId/available-users', requirePermission('team.update'), ctrl.listAvailableUsers);
router.post('/:teamId/members',        requirePermission('team.update'), ctrl.addMember);
router.delete('/:teamId/members/:userId', requirePermission('team.update'), ctrl.removeMember);

module.exports = router;