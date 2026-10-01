const prisma = require('../../config/prisma');
const {
  assertSuperAdmin,
  httpError,
  writeAudit,
  parsePagination,
} = require('./helpers');

// ======================================================
// LIST — all users with role filter
// ======================================================
async function listUsers(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);

  const { limit, offset } = parsePagination(filters);
  const { role, search, status } = filters;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;

  if (role) {
    where.userRoles = { some: { role: { name: role } } };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        userRoles: { include: { role: { select: { name: true } } } },
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { orders: true, joinRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    total,
    count: users.length,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      organizationId: u.organizationId,
      organization: u.organization,
      roles: u.userRoles.map((ur) => ur.role.name),
      orderCount: u._count.orders,
      createdAt: u.createdAt,
    })),
  };
}

// ======================================================
// GET ONE
// ======================================================
async function getUser(adminUser, userId) {
  assertSuperAdmin(adminUser);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: true } },
      organization: true,
      brandTeamMemberships: {
        include: { brand: true, teamRole: true },
      },
      influencerProfile: true,
      _count: { select: { orders: true } },
    },
  });

  if (!user) throw httpError('User not found', 404);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    organization: user.organization,
    roles: user.userRoles.map((ur) => ur.role.name),
    brandMemberships: user.brandTeamMemberships.map((bm) => ({
      id: bm.id,
      brand: { id: bm.brand.id, name: bm.brand.name, slug: bm.brand.slug },
      teamRole: { id: bm.teamRole.id, name: bm.teamRole.name },
      status: bm.status,
    })),
    hasInfluencerProfile: !!user.influencerProfile,
    orderCount: user._count.orders,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ======================================================
// ACTIVATE / DEACTIVATE
// ======================================================
async function setUserActive(adminUser, userId, isActive, req) {
  assertSuperAdmin(adminUser);

  if (adminUser.id === userId) {
    throw httpError('Cannot deactivate your own account', 400);
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw httpError('User not found', 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !!isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  await writeAudit({
    actorId: adminUser.id,
    action: isActive ? 'user.activate' : 'user.deactivate',
    targetType: 'user',
    targetId: userId,
    meta: { email: target.email },
    ipAddress: req?.ip,
  });

  return updated;
}

// ======================================================
// DELETE — with safeguards
// ======================================================
async function deleteUser(adminUser, userId, req) {
  assertSuperAdmin(adminUser);

  if (adminUser.id === userId) {
    throw httpError('Cannot delete your own account', 400);
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });
  if (!target) throw httpError('User not found', 404);

  const targetRoles = target.userRoles.map((ur) => ur.role.name);
  if (targetRoles.includes('SUPER_ADMIN')) {
    throw httpError('Cannot delete another SUPER_ADMIN', 403);
  }

  await prisma.user.delete({ where: { id: userId } });

  await writeAudit({
    actorId: adminUser.id,
    action: 'user.delete',
    targetType: 'user',
    targetId: userId,
    meta: { email: target.email, roles: targetRoles },
    ipAddress: req?.ip,
  });

  return { id: userId };
}

// ======================================================
// CHANGE ROLE
// ======================================================
async function changeUserRole(adminUser, userId, roleName, req) {
  assertSuperAdmin(adminUser);

  if (!roleName) throw httpError('roleName is required', 400);

  if (adminUser.id === userId && roleName !== 'SUPER_ADMIN') {
    throw httpError('Cannot demote yourself from SUPER_ADMIN', 400);
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw httpError(`Role ${roleName} not found`, 404);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw httpError('User not found', 404);

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.create({ data: { userId, roleId: role.id } }),
  ]);

  await writeAudit({
    actorId: adminUser.id,
    action: 'user.changeRole',
    targetType: 'user',
    targetId: userId,
    meta: { newRole: roleName },
    ipAddress: req?.ip,
  });

  return { id: userId, roles: [roleName] };
}

module.exports = {
  listUsers,
  getUser,
  setUserActive,
  deleteUser,
  changeUserRole,
};