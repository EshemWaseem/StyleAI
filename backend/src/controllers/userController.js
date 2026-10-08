// controllers/userController.js
const prisma = require('../config/prisma');

// GET /api/users
async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        organizationId: true,
        phone: true,
        country: true,
        countryCode: true,
        createdAt: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      count: users.length,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        organizationId: u.organizationId,
        phone: u.phone,
        country: u.country,
        countryCode: u.countryCode,
        createdAt: u.createdAt,
        roles: u.userRoles.map((ur) => ur.role.name),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        organizationId: true,
        phone: true,
        country: true,
        countryCode: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        ...user,
        roles: user.userRoles.map((ur) => ur.role.name),
        userRoles: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/roles
async function updateUserRole(req, res, next) {
  try {
    const { roleName } = req.body;
    if (!roleName) {
      return res.status(400).json({ message: 'roleName required' });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: `Role ${roleName} not found` });
    }

    if (
      req.user.id === req.params.id &&
      req.user.roles.includes('SUPER_ADMIN') &&
      roleName !== 'SUPER_ADMIN'
    ) {
      return res
        .status(400)
        .json({ message: 'Cannot demote yourself from SUPER_ADMIN' });
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: req.params.id } }),
      prisma.userRole.create({
        data: { userId: req.params.id, roleId: role.id },
      }),
    ]);

    res.json({ message: 'Role updated', userId: req.params.id, role: roleName });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res, next) {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!target) return res.status(404).json({ message: 'User not found' });

    const targetRoles = target.userRoles.map((ur) => ur.role.name);
    if (
      targetRoles.includes('SUPER_ADMIN') &&
      !req.user.roles.includes('SUPER_ADMIN')
    ) {
      return res
        .status(403)
        .json({ message: 'Only SUPER_ADMIN can delete another SUPER_ADMIN' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted', userId: req.params.id });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/me
async function updateMe(req, res, next) {
  try {
    const userService = require('../services/userService');
    const user = await userService.updateOwnProfile(req.user.id, req.body);
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/me/password
async function changeMyPassword(req, res, next) {
  try {
    const userService = require('../services/userService');
    const { currentPassword, newPassword } = req.body || {};
    await userService.changeOwnPassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUser,
  updateUserRole,
  deleteUser,
  updateMe,
  changeMyPassword,
};