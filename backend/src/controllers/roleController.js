const prisma = require('../config/prisma');

// GET /api/roles  → requires: user.read
async function listRoles(req, res, next) {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.rolePermissions.map((rp) => rp.permission.name),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/roles/permissions  → requires: user.read
async function listPermissions(req, res, next) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ permissions });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRoles, listPermissions };