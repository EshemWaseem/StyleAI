const prisma = require('../config/prisma');
const { ensureDefaultRoles } = require('./brandTeamRoleService');

// ======================================================
// HELPERS
// ======================================================

async function requireBrandOwner(user) {
  if (user.roles.includes('SUPER_ADMIN')) return;
  if (!user.roles.includes('BRAND_OWNER') && !user.roles.includes('AGENCY')) {
    const err = new Error('Only brand owners can review requests');
    err.status = 403;
    throw err;
  }
  if (!user.organizationId) {
    const err = new Error('You must belong to an organization');
    err.status = 403;
    throw err;
  }
}

async function resolveBrandForOwner(user, brandId) {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    const err = new Error('Brand not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return brand;
}

function shape(r) {
  return {
    id: r.id,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reviewedAt: r.reviewedAt,
    user: r.user
      ? { id: r.user.id, name: r.user.name, email: r.user.email }
      : undefined,
    brand: r.brand
      ? { id: r.brand.id, name: r.brand.name, slug: r.brand.slug }
      : undefined,
    reviewer: r.reviewer
      ? { id: r.reviewer.id, name: r.reviewer.name }
      : undefined,
    requestedRole: r.requestedRole
      ? {
          id: r.requestedRole.id,
          name: r.requestedRole.name,
          color: r.requestedRole.color,
        }
      : undefined,
    approvedRole: r.approvedRole
      ? {
          id: r.approvedRole.id,
          name: r.approvedRole.name,
          color: r.approvedRole.color,
        }
      : undefined,
  };
}

// ======================================================
// USER SENDS REQUEST
// ======================================================

async function createRequest(user, { brandId, message, requestedRoleId }) {
  if (!brandId) {
    const err = new Error('brandId is required');
    err.status = 400;
    throw err;
  }

  if (user.roles.includes('BRAND_OWNER') || user.roles.includes('AGENCY')) {
    const err = new Error('You already own an organization');
    err.status = 400;
    throw err;
  }

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: { organization: true },
  });
  if (!brand) {
    const err = new Error('Brand not found');
    err.status = 404;
    throw err;
  }

  // Ensure brand has default roles before validating the requested role
  await ensureDefaultRoles(brand.id);

  // Validate requested role (optional, but if given must belong to brand)
  let validRoleId = null;
  if (requestedRoleId) {
    const role = await prisma.brandTeamRole.findUnique({
      where: { id: requestedRoleId },
    });
    if (!role || role.brandId !== brand.id) {
      const err = new Error('Requested role not found for this brand');
      err.status = 400;
      throw err;
    }
    validRoleId = role.id;
  }

  const existing = await prisma.brandJoinRequest.findUnique({
    where: { userId_brandId: { userId: user.id, brandId } },
  });

  if (existing) {
    if (existing.status === 'PENDING') {
      const err = new Error('You already have a pending request for this brand');
      err.status = 409;
      throw err;
    }
    const updated = await prisma.brandJoinRequest.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING',
        message: message ?? null,
        requestedRoleId: validRoleId,
        approvedRoleId: null,
        reviewedBy: null,
        reviewedAt: null,
      },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        requestedRole: true,
      },
    });
    return shape(updated);
  }

  const request = await prisma.brandJoinRequest.create({
    data: {
      userId: user.id,
      brandId,
      message: message ?? null,
      requestedRoleId: validRoleId,
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      requestedRole: true,
    },
  });

  return shape(request);
}

// ======================================================
// USER — MY REQUESTS
// ======================================================

async function listMine(user) {
  const requests = await prisma.brandJoinRequest.findMany({
    where: { userId: user.id },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          organization: { select: { name: true } },
        },
      },
      requestedRole: true,
      approvedRole: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return requests.map(shape);
}

// ======================================================
// OWNER — LIST PENDING
// ======================================================

async function listForBrandOwner(user, { status = 'PENDING' } = {}) {
  await requireBrandOwner(user);

  const where = {
    brand: {
      organizationId: user.roles.includes('SUPER_ADMIN')
        ? undefined
        : user.organizationId,
    },
  };
  if (status && status !== 'ALL') where.status = status;

  const requests = await prisma.brandJoinRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      brand: { select: { id: true, name: true, slug: true } },
      reviewer: { select: { id: true, name: true } },
      requestedRole: true,
      approvedRole: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map(shape);
}

// ======================================================
// OWNER — APPROVE (with role assignment)
// ======================================================

async function approve(user, requestId, { approvedRoleId } = {}) {
  await requireBrandOwner(user);

  const request = await prisma.brandJoinRequest.findUnique({
    where: { id: requestId },
    include: { brand: true, requestedRole: true },
  });
  if (!request) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }

  if (
    !user.roles.includes('SUPER_ADMIN') &&
    request.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  if (request.status !== 'PENDING') {
    const err = new Error('Request already reviewed');
    err.status = 400;
    throw err;
  }

  await ensureDefaultRoles(request.brandId);

  // Determine role — owner override > requested > default first role
  let targetRoleId = approvedRoleId || request.requestedRoleId;

  if (!targetRoleId) {
    // Fallback to first non-owner default role
    const fallback = await prisma.brandTeamRole.findFirst({
      where: { brandId: request.brandId, isOwnerRole: false },
      orderBy: { name: 'asc' },
    });
    if (!fallback) {
      const err = new Error('No roles configured for this brand');
      err.status = 500;
      throw err;
    }
    targetRoleId = fallback.id;
  }

  // Validate role belongs to brand
  const targetRole = await prisma.brandTeamRole.findUnique({
    where: { id: targetRoleId },
  });
  if (!targetRole || targetRole.brandId !== request.brandId) {
    const err = new Error('Invalid role for this brand');
    err.status = 400;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Attach user to organization
    await tx.user.update({
      where: { id: request.userId },
      data: { organizationId: request.brand.organizationId },
    });

    // 2. Add global BRAND_TEAM_MEMBER role
    const teamRole = await tx.role.findUnique({
      where: { name: 'BRAND_TEAM_MEMBER' },
    });
    const hasRole = await tx.userRole.findUnique({
      where: { userId_roleId: { userId: request.userId, roleId: teamRole.id } },
    });
    if (!hasRole) {
      await tx.userRole.create({
        data: { userId: request.userId, roleId: teamRole.id },
      });
    }

    // 3. Create or reactivate BrandTeamMember
    const existingMembership = await tx.brandTeamMember.findUnique({
      where: {
        brandId_userId: { brandId: request.brandId, userId: request.userId },
      },
    });

    if (existingMembership) {
      await tx.brandTeamMember.update({
        where: { id: existingMembership.id },
        data: {
          teamRoleId: targetRoleId,
          status: 'ACTIVE',
          invitedBy: user.id,
        },
      });
    } else {
      await tx.brandTeamMember.create({
        data: {
          brandId: request.brandId,
          userId: request.userId,
          teamRoleId: targetRoleId,
          status: 'ACTIVE',
          invitedBy: user.id,
        },
      });
    }

    // 4. Mark request approved
    return tx.brandJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        approvedRoleId: targetRoleId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        brand: { select: { id: true, name: true, slug: true } },
        requestedRole: true,
        approvedRole: true,
      },
    });
  });

  return shape(result);
}

// ======================================================
// OWNER — REJECT
// ======================================================

async function reject(user, requestId, reason) {
  await requireBrandOwner(user);

  const request = await prisma.brandJoinRequest.findUnique({
    where: { id: requestId },
    include: { brand: true },
  });
  if (!request) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    request.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  if (request.status !== 'PENDING') {
    const err = new Error('Request already reviewed');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.brandJoinRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      message: reason ?? request.message,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      brand: { select: { id: true, name: true, slug: true } },
      requestedRole: true,
      approvedRole: true,
    },
  });

  return shape(updated);
}

// ======================================================
// USER — CANCEL OWN REQUEST
// ======================================================

async function cancelMine(user, requestId) {
  const request = await prisma.brandJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.userId !== user.id) {
    const err = new Error('Request not found');
    err.status = 404;
    throw err;
  }
  if (request.status !== 'PENDING') {
    const err = new Error('Can only cancel pending requests');
    err.status = 400;
    throw err;
  }
  await prisma.brandJoinRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  });
  return { id: requestId };
}

module.exports = {
  createRequest,
  listMine,
  listForBrandOwner,
  approve,
  reject,
  cancelMine,
};