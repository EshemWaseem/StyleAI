const prisma = require('../config/prisma');
const {
  DEFAULT_BRAND_TEAM_ROLES,
  filterValidPermissions,
  ALL_BRAND_TEAM_PERMISSION_KEYS,
  BRAND_TEAM_PERMISSIONS,
} = require('../config/brandTeamPermissions');

// ======================================================
// HELPERS
// ======================================================

/**
 * Resolve the brand owned by the user's organization.
 * SUPER_ADMIN can pass brandId explicitly.
 */
async function resolveBrand(user, brandId = null) {
  if (brandId) {
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
      const err = new Error('Forbidden: brand belongs to another organization');
      err.status = 403;
      throw err;
    }
    return brand;
  }

  if (!user.organizationId) {
    const err = new Error('You must belong to an organization');
    err.status = 403;
    throw err;
  }

  const brand = await prisma.brand.findFirst({
    where: { organizationId: user.organizationId },
  });
  if (!brand) {
    const err = new Error('Create your brand first');
    err.status = 400;
    err.code = 'NO_BRAND';
    throw err;
  }
  return brand;
}

/**
 * Ensure brand has all 4 default roles.
 * Idempotent — safe to call multiple times.
 */
async function ensureDefaultRoles(brandId) {
  const existing = await prisma.brandTeamRole.findMany({
    where: { brandId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((r) => r.name));

  const toCreate = DEFAULT_BRAND_TEAM_ROLES.filter(
    (role) => !existingNames.has(role.name)
  );

  if (toCreate.length === 0) return;

  await prisma.brandTeamRole.createMany({
    data: toCreate.map((role) => ({
      brandId,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color,
      isOwnerRole: role.isOwnerRole,
      isDefault: true,
    })),
  });
}

function shape(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions ?? [],
    color: role.color,
    isDefault: role.isDefault,
    isOwnerRole: role.isOwnerRole,
    memberCount: role._count?.members,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

// ======================================================
// LIST
// ======================================================

async function listRoles(user, brandId = null) {
  const brand = await resolveBrand(user, brandId);
  await ensureDefaultRoles(brand.id);

  const roles = await prisma.brandTeamRole.findMany({
    where: { brandId: brand.id },
    include: { _count: { select: { members: true } } },
    orderBy: [{ isOwnerRole: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
  });

  return roles.map(shape);
}

// ======================================================
// GET ONE
// ======================================================

async function getRole(user, roleId) {
  const role = await prisma.brandTeamRole.findUnique({
    where: { id: roleId },
    include: {
      brand: true,
      _count: { select: { members: true } },
    },
  });
  if (!role) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    role.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return shape(role);
}

// ======================================================
// CREATE
// ======================================================

async function createRole(user, { brandId = null, name, description, permissions, color }) {
  const brand = await resolveBrand(user, brandId);
  await ensureDefaultRoles(brand.id);

  if (!name || !name.trim()) {
    const err = new Error('Role name is required');
    err.status = 400;
    throw err;
  }

  const cleanPermissions = filterValidPermissions(permissions);
  if (cleanPermissions.length === 0) {
    const err = new Error('At least one valid permission is required');
    err.status = 400;
    throw err;
  }

  const conflict = await prisma.brandTeamRole.findUnique({
    where: { brandId_name: { brandId: brand.id, name: name.trim() } },
  });
  if (conflict) {
    const err = new Error('A role with this name already exists for your brand');
    err.status = 409;
    throw err;
  }

  const role = await prisma.brandTeamRole.create({
    data: {
      brandId: brand.id,
      name: name.trim(),
      description: description?.trim() || null,
      permissions: cleanPermissions,
      color: color || 'zinc',
      isDefault: false,
      isOwnerRole: false,
    },
    include: { _count: { select: { members: true } } },
  });

  return shape(role);
}

// ======================================================
// UPDATE
// ======================================================

async function updateRole(user, roleId, { name, description, permissions, color }) {
  const existing = await prisma.brandTeamRole.findUnique({
    where: { id: roleId },
    include: { brand: true },
  });
  if (!existing) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    existing.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const updateData = {};

  if (name !== undefined) {
    if (!name.trim()) {
      const err = new Error('Role name cannot be empty');
      err.status = 400;
      throw err;
    }
    if (name.trim() !== existing.name) {
      const conflict = await prisma.brandTeamRole.findUnique({
        where: { brandId_name: { brandId: existing.brandId, name: name.trim() } },
      });
      if (conflict) {
        const err = new Error('A role with this name already exists');
        err.status = 409;
        throw err;
      }
    }
    updateData.name = name.trim();
  }

  if (description !== undefined) {
    updateData.description = description?.trim() || null;
  }

  if (permissions !== undefined) {
    const clean = filterValidPermissions(permissions);
    if (clean.length === 0) {
      const err = new Error('At least one valid permission is required');
      err.status = 400;
      throw err;
    }
    updateData.permissions = clean;
  }

  if (color !== undefined) updateData.color = color;

  // Owner role: permissions cannot be reduced to zero
  if (existing.isOwnerRole && Array.isArray(updateData.permissions)) {
    if (updateData.permissions.length === 0) {
      const err = new Error('Owner role must have at least one permission');
      err.status = 400;
      throw err;
    }
  }

  const updated = await prisma.brandTeamRole.update({
    where: { id: roleId },
    data: updateData,
    include: { _count: { select: { members: true } } },
  });

  return shape(updated);
}

// ======================================================
// DELETE
// ======================================================

async function deleteRole(user, roleId) {
  const existing = await prisma.brandTeamRole.findUnique({
    where: { id: roleId },
    include: {
      brand: true,
      _count: { select: { members: true } },
    },
  });
  if (!existing) {
    const err = new Error('Role not found');
    err.status = 404;
    throw err;
  }
  if (
    !user.roles.includes('SUPER_ADMIN') &&
    existing.brand.organizationId !== user.organizationId
  ) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  if (existing.isOwnerRole) {
    const err = new Error('Cannot delete the owner role');
    err.status = 400;
    throw err;
  }

  if (existing._count.members > 0) {
    const err = new Error(
      `Cannot delete: ${existing._count.members} member(s) still assigned to this role. Reassign them first.`
    );
    err.status = 409;
    throw err;
  }

  await prisma.brandTeamRole.delete({ where: { id: roleId } });
  return { id: roleId };
}

// ======================================================
// METADATA — for frontend role editor
// ======================================================

function getPermissionCatalog() {
  return {
    groups: BRAND_TEAM_PERMISSIONS,
    allKeys: ALL_BRAND_TEAM_PERMISSION_KEYS,
  };
}

module.exports = {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  ensureDefaultRoles,
  getPermissionCatalog,
};