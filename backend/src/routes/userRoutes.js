//userroute.js
const router = require('express').Router();
const {
  authenticate,
  requirePermission,
} = require('../middleware/auth');
const ctrl = require('../controllers/userController');

// ======================================================
// SELF ROUTES — must come BEFORE /:id
// ======================================================
router.patch('/me', authenticate, ctrl.updateMe);
router.patch('/me/password', authenticate, ctrl.changeMyPassword);

// ======================================================
// ADMIN ROUTES
// ======================================================
router.get('/', authenticate, requirePermission('user.read'), ctrl.listUsers);

router.get(
  '/:id',
  authenticate,
  requirePermission('user.read'),
  ctrl.getUser
);

router.patch(
  '/:id/roles',
  authenticate,
  requirePermission('user.update'),
  ctrl.updateUserRole
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('user.delete'),
  ctrl.deleteUser
);

module.exports = router;