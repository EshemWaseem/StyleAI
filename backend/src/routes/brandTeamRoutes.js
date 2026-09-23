const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/brandTeamController');

router.use(authenticate);

// ======================================================
// ME
// ======================================================
router.get('/me', ctrl.getMyMembership);

// ======================================================
// PERMISSION CATALOG
// ======================================================
router.get('/permissions', ctrl.listPermissions);

// ======================================================
// ROLES
// ======================================================
router.get('/roles', ctrl.listRoles);
router.get('/roles/:roleId', ctrl.getRole);
router.post('/roles', requirePermission('team.update'), ctrl.createRole);
router.patch('/roles/:roleId', requirePermission('team.update'), ctrl.updateRole);
router.delete('/roles/:roleId', requirePermission('team.delete'), ctrl.deleteRole);

// ======================================================
// MEMBERS
// ======================================================
router.get('/members', ctrl.listMembers);

// ⚠️ MUST be BEFORE /members/:memberId to avoid collision
router.post('/members/add', requirePermission('team.update'), ctrl.directAdd);

router.get('/members/:memberId', ctrl.getMember);
router.patch(
  '/members/:memberId/role',
  requirePermission('team.update'),
  ctrl.changeRole
);
router.patch(
  '/members/:memberId/status',
  requirePermission('team.update'),
  ctrl.setStatus
);
router.delete(
  '/members/:memberId',
  requirePermission('team.delete'),
  ctrl.removeMember
);

module.exports = router;