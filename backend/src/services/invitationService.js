const crypto = require('crypto');
const prisma = require('../config/prisma');
const { ensureDefaultRoles } = require('./brandTeamRoleService');

// ======================================================
// HELPERS
// ======================================================

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function requireOwner(user) {
  if (user.roles.includes('SUPER_ADMIN')) return;
  if (!user.roles.includes('BRAND_OWNER') && !user.roles.includes('AGENCY')) {
    const err = new Error('Only brand owners can send invitations');
    err.status = 403;
    throw err;
  }
  if (!user.organizationId) {
    const err = new Error('You must belong to an organization');
    err.status = 403;
    throw err;
  }
}

/**
 * Shape an invitation.
 * @param {object} i — Prisma invitation row
 * @param {object} opts
 * @param {boolean} opts.includeToken — include token (for received list)
 */
function shape(i, opts = {}) {
  const result = {
    id: i.id,
    email: i.email,
    status: i.status,
    message: i.message,
    expiresAt: i.expiresAt,
    acceptedAt: i.acceptedAt,
    createdAt: i.createdAt,
    brand: i.brand
      ? { id: i.brand.id, name: i.brand.name, slug: i.brand.slug }
      : undefined,
    invitedBy: i.invitedBy
      ? { id: i.invitedBy.id, name: i.invitedBy.name }
      : undefined,
    teamRole: i.teamRole
      ? {
          id: i.teamRole.id,
          name: i.teamRole.name,
          color: i.teamRole.color,
        }
      : undefined,
  };

  if (opts.includeToken && i.token) {
    result.token = i.token;
    result.inviteUrl = `/invite/${i.token}`;
  }

  return result;
}

// ======================================================
// CREATE INVITATION
// ======================================================

async function createInvitation(user, { email, message, teamRoleId }) {
  await requireOwner(user);

  if (!email || !email.trim()) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }
  const normalizedEmail = email.trim().toLowerCase();

  const brand = await prisma.brand.findFirst({
    where: {
      organizationId: user.roles.includes('SUPER_ADMIN')
        ? undefined
        : user.organizationId,
    },
  });
  if (!brand) {
    const err = new Error('Create your brand first');
    err.status = 400;
    err.code = 'NO_BRAND';
    throw err;
  }

  await ensureDefaultRoles(brand.id);

  if (!teamRoleId) {
    const err = new Error('Please select a role for the invitee');
    err.status = 400;
    throw err;
  }

  const role = await prisma.brandTeamRole.findUnique({
    where: { id: teamRoleId },
  });
  if (!role || role.brandId !== brand.id) {
    const err = new Error('Role not found for this brand');
    err.status = 400;
    throw err;
  }

  // Check if user exists and is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser && existingUser.organizationId === brand.organizationId) {
    const err = new Error('This user is already a member of your organization');
    err.status = 409;
    throw err;
  }

  // Check for existing pending invite for same email + brand
  const existingInvite = await prisma.brandInvitation.findFirst({
    where: {
      email: normalizedEmail,
      brandId: brand.id,
      status: 'PENDING',
    },
  });
  if (existingInvite) {
    const err = new Error('An invitation is already pending for this email');
    err.status = 409;
    throw err;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.brandInvitation.create({
    data: {
      brandId: brand.id,
      invitedById: user.id,
      email: normalizedEmail,
      teamRoleId: role.id,
      token,
      message: message ?? null,
      expiresAt,
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { id: true, name: true } },
      teamRole: true,
    },
  });

  return shape(invite, { includeToken: true });
}

// ======================================================
// LIST SENT — owner's invitations
// ======================================================

async function listSent(user) {
  await requireOwner(user);

  const invites = await prisma.brandInvitation.findMany({
    where: { invitedById: user.id },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      teamRole: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return invites.map((i) => shape(i));
}

// ======================================================
// LIST RECEIVED — invitations to current user's email
// ======================================================

async function listReceived(user) {
  // Auto-expire any past-due invitations for this email
  await prisma.brandInvitation.updateMany({
    where: {
      email: user.email.toLowerCase(),
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  const invites = await prisma.brandInvitation.findMany({
    where: {
      email: user.email.toLowerCase(),
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { id: true, name: true } },
      teamRole: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Include token so teammate can accept directly from list
  return invites.map((i) => shape(i, { includeToken: true }));
}

// ======================================================
// GET BY TOKEN (public)
// ======================================================

async function getByToken(token) {
  const invite = await prisma.brandInvitation.findUnique({
    where: { token },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { id: true, name: true } },
      teamRole: true,
    },
  });

  if (!invite) {
    const err = new Error('Invitation not found');
    err.status = 404;
    throw err;
  }

  if (invite.status === 'PENDING' && invite.expiresAt < new Date()) {
    await prisma.brandInvitation.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    invite.status = 'EXPIRED';
  }

  return shape(invite);
}

// ======================================================
// ACCEPT INVITATION
// ======================================================

async function accept(user, token) {
  const invite = await prisma.brandInvitation.findUnique({
    where: { token },
    include: { brand: true, teamRole: true },
  });

  if (!invite) {
    const err = new Error('Invitation not found');
    err.status = 404;
    throw err;
  }

  if (invite.status !== 'PENDING') {
    const err = new Error(`Invitation is ${invite.status.toLowerCase()}`);
    err.status = 400;
    throw err;
  }

  if (invite.expiresAt < new Date()) {
    await prisma.brandInvitation.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    const err = new Error('Invitation has expired');
    err.status = 400;
    throw err;
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    const err = new Error(
      `This invitation was sent to ${invite.email}. Please log in with that email.`
    );
    err.status = 403;
    throw err;
  }

  // If user belongs to a different org → block
  if (
    user.organizationId &&
    user.organizationId !== invite.brand.organizationId
  ) {
    const err = new Error('You already belong to another organization');
    err.status = 400;
    throw err;
  }

  // Resolve target role
  let targetRoleId = invite.teamRoleId;
  if (!targetRoleId) {
    await ensureDefaultRoles(invite.brandId);
    const fallback = await prisma.brandTeamRole.findFirst({
      where: { brandId: invite.brandId, isOwnerRole: false },
      orderBy: { name: 'asc' },
    });
    if (fallback) targetRoleId = fallback.id;
  }

  if (!targetRoleId) {
    const err = new Error('No valid role for this invitation');
    err.status = 500;
    throw err;
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Attach to org
    await tx.user.update({
      where: { id: user.id },
      data: { organizationId: invite.brand.organizationId },
    });

    // 2. Add global role
    const globalTeamRole = await tx.role.findUnique({
      where: { name: 'BRAND_TEAM_MEMBER' },
    });
    const hasRole = await tx.userRole.findUnique({
      where: {
        userId_roleId: { userId: user.id, roleId: globalTeamRole.id },
      },
    });
    if (!hasRole) {
      await tx.userRole.create({
        data: { userId: user.id, roleId: globalTeamRole.id },
      });
    }

    // 3. Create/reactivate membership
    const existingMembership = await tx.brandTeamMember.findUnique({
      where: {
        brandId_userId: { brandId: invite.brandId, userId: user.id },
      },
    });

    if (existingMembership) {
      await tx.brandTeamMember.update({
        where: { id: existingMembership.id },
        data: {
          teamRoleId: targetRoleId,
          status: 'ACTIVE',
        },
      });
    } else {
      await tx.brandTeamMember.create({
        data: {
          brandId: invite.brandId,
          userId: user.id,
          teamRoleId: targetRoleId,
          status: 'ACTIVE',
          invitedBy: invite.invitedById,
        },
      });
    }

    // 4. Cancel any pending join requests from this user for this brand
    await tx.brandJoinRequest.updateMany({
      where: {
        userId: user.id,
        brandId: invite.brandId,
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        reviewedBy: invite.invitedById,
        reviewedAt: new Date(),
        approvedRoleId: targetRoleId,
      },
    });

    // 5. Mark invitation accepted
    return tx.brandInvitation.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: user.id,
      },
    });
  });

  return { id: result.id, status: result.status };
}

// ======================================================
// DECLINE
// ======================================================

async function decline(user, token) {
  const invite = await prisma.brandInvitation.findUnique({
    where: { token },
  });
  if (!invite) {
    const err = new Error('Invitation not found');
    err.status = 404;
    throw err;
  }
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    const err = new Error('This invitation is not for you');
    err.status = 403;
    throw err;
  }
  if (invite.status !== 'PENDING') {
    const err = new Error(`Invitation is ${invite.status.toLowerCase()}`);
    err.status = 400;
    throw err;
  }
  await prisma.brandInvitation.update({
    where: { id: invite.id },
    data: { status: 'DECLINED' },
  });
  return { id: invite.id };
}

// ======================================================
// CANCEL (owner)
// ======================================================

async function cancel(user, inviteId) {
  await requireOwner(user);
  const invite = await prisma.brandInvitation.findUnique({
    where: { id: inviteId },
  });
  if (!invite || invite.invitedById !== user.id) {
    const err = new Error('Invitation not found');
    err.status = 404;
    throw err;
  }
  if (invite.status !== 'PENDING') {
    const err = new Error('Can only cancel pending invitations');
    err.status = 400;
    throw err;
  }
  await prisma.brandInvitation.update({
    where: { id: inviteId },
    data: { status: 'CANCELLED' },
  });
  return { id: inviteId };
}

// ======================================================
// REDEEM BY CODE/LINK — teammate pastes link or token
// ======================================================

async function redeemByToken(user, input) {
  if (!input || !input.trim()) {
    const err = new Error('Invitation link or code is required');
    err.status = 400;
    throw err;
  }

  let token = input.trim();

  // Extract token from a full URL
  if (token.startsWith('http://') || token.startsWith('https://')) {
    try {
      const url = new URL(token);
      const parts = url.pathname.split('/').filter(Boolean);
      token = parts[parts.length - 1] || '';
    } catch {
      const err = new Error('Invalid invitation link');
      err.status = 400;
      throw err;
    }
  }

  if (!token || token.length < 20) {
    const err = new Error('Invalid invitation code');
    err.status = 400;
    throw err;
  }

  // Reuse accept flow (it already validates status, expiry, email match)
  return accept(user, token);
}

module.exports = {
  createInvitation,
  listSent,
  listReceived,
  getByToken,
  accept,
  decline,
  cancel,
  redeemByToken,
};

// module.exports = {
//   createInvitation,
//   listSent,
//   getByToken,
//   accept,
//   decline,
//   cancel,
// };