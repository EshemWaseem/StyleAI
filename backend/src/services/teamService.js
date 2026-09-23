const prisma = require('../config/prisma');

// ======================================================
// TENANT HELPERS (same pattern as brandService)
// ======================================================
function tenantWhere(user) {
  if (user.roles.includes('SUPER_ADMIN')) return {};
  if (!user.organizationId) return { organizationId: '__none__' };
  return { organizationId: user.organizationId };
}

function assertTenantAccess(user, organizationId) {
  if (user.roles.includes('SUPER_ADMIN')) return;
  if (!user.organizationId || user.organizationId !== organizationId) {
    const err = new Error('Forbidden: resource belongs to another organization');
    err.status = 403;
    throw err;
  }
}

function assertHasOrg(user) {
  if (user.roles.includes('SUPER_ADMIN')) return;
  if (!user.organizationId) {
    const err = new Error('You must belong to an organization to do this');
    err.status = 403;
    throw err;
  }
}

// ======================================================
// LIST
// ======================================================
async function listTeams(user) {
  const teams = await prisma.team.findMany({
    where: tenantWhere(user),
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    organization: t.organization,
    memberCount: t._count.members,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

// ======================================================
// GET ONE (with members)
// ======================================================
async function getTeam(user, teamId) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRoles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!team) {
    const err = new Error('Team not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, team.organizationId);

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    organization: team.organization,
    members: team.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      roles: m.user.userRoles.map((ur) => ur.role.name),
      joinedAt: m.createdAt,
    })),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

// ======================================================
// CREATE
// ======================================================
async function createTeam(user, data) {
  assertHasOrg(user);

  const { name, description } = data;
  if (!name || !name.trim()) {
    const err = new Error('Team name is required');
    err.status = 400;
    throw err;
  }

  const organizationId = user.roles.includes('SUPER_ADMIN') && data.organizationId
    ? data.organizationId
    : user.organizationId;

  return prisma.team.create({
    data: {
      organizationId,
      name: name.trim(),
      description: description ?? null,
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
}

// ======================================================
// UPDATE
// ======================================================
async function updateTeam(user, teamId, data) {
  const existing = await prisma.team.findUnique({ where: { id: teamId } });
  if (!existing) {
    const err = new Error('Team not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.organizationId);

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  return prisma.team.update({
    where: { id: teamId },
    data: updateData,
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
}

// ======================================================
// DELETE
// ======================================================
async function deleteTeam(user, teamId) {
  const existing = await prisma.team.findUnique({ where: { id: teamId } });
  if (!existing) {
    const err = new Error('Team not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.organizationId);

  await prisma.team.delete({ where: { id: teamId } });
  return { id: teamId };
}

// ======================================================
// MEMBERS
// ======================================================
async function addMember(user, teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    const err = new Error('Team not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, team.organizationId);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // User must belong to the same org (or be SUPER_ADMIN adding themselves)
  if (!user.roles.includes('SUPER_ADMIN')) {
    if (target.organizationId !== team.organizationId) {
      const err = new Error('User belongs to a different organization');
      err.status = 403;
      throw err;
    }
  }

  const existing = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (existing) {
    const err = new Error('User is already a member');
    err.status = 409;
    throw err;
  }

  return prisma.teamMember.create({
    data: { teamId, userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

async function removeMember(user, teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    const err = new Error('Team not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, team.organizationId);

  const member = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!member) {
    const err = new Error('User is not a member of this team');
    err.status = 404;
    throw err;
  }

  await prisma.teamMember.delete({ where: { id: member.id } });
  return { teamId, userId };
}

async function listAvailableUsers(user, teamId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    const err = new Error('Team not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, team.organizationId);

  const currentMembers = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });
  const memberIds = currentMembers.map((m) => m.userId);

  const users = await prisma.user.findMany({
    where: {
      organizationId: team.organizationId,
      id: { notIn: memberIds },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return users;
}

module.exports = {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  listAvailableUsers,
};