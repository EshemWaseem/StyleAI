// backend/src/services/admin/approval.js
const prisma = require('../../config/prisma');
const { assertSuperAdmin, httpError, writeAudit } = require('./helpers');
const { notifyUser } = require('../notifications');

async function listPending(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);

  const status = filters.status || 'PENDING';
  const where = { adminApprovalStatus: status };

  if (filters.role) {
    where.userRoles = { some: { role: { name: filters.role } } };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { adminApprovalRequestedAt: 'desc' },
    take: 100,
    include: {
      userRoles: { include: { role: { select: { name: true } } } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    roles: u.userRoles.map((ur) => ur.role.name),
    organization: u.organization,
    adminApprovalStatus: u.adminApprovalStatus,
    adminApprovalRequestedAt: u.adminApprovalRequestedAt,
    adminApprovalReviewedAt: u.adminApprovalReviewedAt,
    adminApprovalReason: u.adminApprovalReason,
    createdAt: u.createdAt,
  }));
}

async function approve(adminUser, userId, req) {
  assertSuperAdmin(adminUser);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user) throw httpError('User not found', 404);

  if (user.adminApprovalStatus === 'APPROVED') {
    throw httpError('User is already approved', 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      adminApprovalStatus: 'APPROVED',
      adminApprovalReviewedAt: new Date(),
      adminApprovalReviewedBy: adminUser.id,
      adminApprovalReason: null,
    },
  });

  await writeAudit({
    actorId: adminUser.id,
    action: 'user.adminApprove',
    targetType: 'user',
    targetId: userId,
    meta: {
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    },
    ipAddress: req?.ip,
  });

  notifyUser(user.id, {
    type: 'SYSTEM',
    title: '🎉 Your StyleAI account is approved',
    body: 'Welcome! You can now sign in and start using your workspace.',
    link: '/login',
    meta: { event: 'ADMIN_APPROVED' },
    emailTemplate: 'adminApprovalApproved',
    emailData: { userName: user.name },
  }).catch((e) => console.error('[approve.notify]', e.message));

  return { id: updated.id, adminApprovalStatus: updated.adminApprovalStatus };
}

async function reject(adminUser, userId, reason, req) {
  assertSuperAdmin(adminUser);

  if (!reason || !String(reason).trim()) {
    throw httpError('Rejection reason is required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user) throw httpError('User not found', 404);

  const trimmedReason = String(reason).trim();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      adminApprovalStatus: 'REJECTED',
      adminApprovalReviewedAt: new Date(),
      adminApprovalReviewedBy: adminUser.id,
      adminApprovalReason: trimmedReason,
    },
  });

  await writeAudit({
    actorId: adminUser.id,
    action: 'user.adminReject',
    targetType: 'user',
    targetId: userId,
    meta: {
      email: user.email,
      reason: trimmedReason,
      roles: user.userRoles.map((ur) => ur.role.name),
    },
    ipAddress: req?.ip,
  });

  notifyUser(user.id, {
    type: 'SYSTEM',
    title: 'Account approval update',
    body: trimmedReason,
    link: '/login',
    meta: { event: 'ADMIN_REJECTED', reason: trimmedReason },
    emailTemplate: 'adminApprovalRejected',
    emailData: { userName: user.name, reason: trimmedReason },
  }).catch((e) => console.error('[reject.notify]', e.message));

  return { id: updated.id, adminApprovalStatus: updated.adminApprovalStatus };
}

module.exports = { listPending, approve, reject };