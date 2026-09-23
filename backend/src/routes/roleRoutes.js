const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { listRoles, listPermissions } = require('../controllers/roleController');

router.get(
  '/',
  authenticate,
  requirePermission('user.read'),
  listRoles
);

router.get(
  '/permissions',
  authenticate,
  requirePermission('user.read'),
  listPermissions
);

module.exports = router;