const prisma = require('../config/prisma');
const { ensureDefaultRoles } = require('./brandTeamRoleService');

// ======================================================
// TENANT HELPERS
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
// SLUG
// ======================================================

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ======================================================
// LIST
// ======================================================

async function listBrands(user, { search } = {}) {
  const where = { ...tenantWhere(user) };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const brands = await prisma.brand.findMany({
    where,
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description,
    logoUrl: b.logoUrl,
    website: b.website,
    country: b.country,
    currency: b.currency,
    brandVoice: b.brandVoice,
    brandStyle: b.brandStyle,
    targetAge: b.targetAge,
    targetGender: b.targetGender,
    organization: b.organization,
    productCount: b._count.products,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));
}

// ======================================================
// GET ONE
// ======================================================

async function getBrand(user, brandId) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });

  if (!brand) {
    const err = new Error('Brand not found');
    err.status = 404;
    throw err;
  }

  assertTenantAccess(user, brand.organizationId);

  return {
    ...brand,
    productCount: brand._count.products,
    _count: undefined,
  };
}

// ======================================================
// CREATE — one brand per org + auto default team roles
// ======================================================

async function createBrand(user, data) {

   const canCreateBrand = user.roles.some((r) =>
    ['SUPER_ADMIN', 'BRAND_OWNER', 'AGENCY'].includes(r)
  );
  if (!canCreateBrand) {
    const err = new Error('Only brand owners can create a brand');
    err.status = 403;
    throw err;
  }

  assertHasOrg(user);

  // ---- BUSINESS RULE: 1 organization = 1 brand ----
  const existingBrand = await prisma.brand.findFirst({
    where: { organizationId: user.organizationId },
  });

  if (existingBrand) {
    const err = new Error(
      'Your organization already has a brand. Each organization can only have one brand. You can edit the existing brand instead.'
    );
    err.status = 409;
    err.code = 'BRAND_ALREADY_EXISTS';
    throw err;
  }

  const {
    name,
    description,
    logoUrl,
    website,
    country,
    currency,
    brandVoice,
    brandStyle,
    targetAge,
    targetGender,
  } = data;

  if (!name || !name.trim()) {
    const err = new Error('Brand name is required');
    err.status = 400;
    throw err;
  }

  const organizationId =
    user.roles.includes('SUPER_ADMIN') && data.organizationId
      ? data.organizationId
      : user.organizationId;

  // Unique slug per organization
  const baseSlug = slugify(name);
  const existing = await prisma.brand.findFirst({
    where: { organizationId, slug: baseSlug },
  });
  const slug = existing
    ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
    : baseSlug;

  const brand = await prisma.brand.create({
    data: {
      organizationId,
      name: name.trim(),
      slug,
      description: description ?? null,
      logoUrl: logoUrl ?? null,
      website: website ?? null,
      country: country ?? null,
      currency: currency ?? null,
      brandVoice: brandVoice ?? null,
      brandStyle: brandStyle ?? null,
      targetAge: targetAge ?? null,
      targetGender: targetGender ?? null,
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  // Auto-create default brand team roles (Campaign/Product/Inventory/Full Access)
  await ensureDefaultRoles(brand.id);

  return brand;
}

// ======================================================
// UPDATE
// ======================================================

async function updateBrand(user, brandId, data) {
  const existing = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!existing) {
    const err = new Error('Brand not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.organizationId);

  const updateData = {};
  const allowed = [
    'name',
    'description',
    'logoUrl',
    'website',
    'country',
    'currency',
    'brandVoice',
    'brandStyle',
    'targetAge',
    'targetGender',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  if (updateData.name && updateData.name !== existing.name) {
    const baseSlug = slugify(updateData.name);
    const conflict = await prisma.brand.findFirst({
      where: {
        organizationId: existing.organizationId,
        slug: baseSlug,
        NOT: { id: brandId },
      },
    });
    updateData.slug = conflict
      ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
      : baseSlug;
  }

  return prisma.brand.update({
    where: { id: brandId },
    data: updateData,
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
}

// ======================================================
// DELETE
// ======================================================

async function deleteBrand(user, brandId) {
  const existing = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!existing) {
    const err = new Error('Brand not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.organizationId);

  await prisma.brand.delete({ where: { id: brandId } });
  return { id: brandId };
}

// ======================================================
// PUBLIC — all brands (for register teammate flow)
// ======================================================

async function listPublicBrandsAll() {
  const brands = await prisma.brand.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      organization: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
  return brands;
}

// ======================================================
// PUBLIC — brands that have at least one product (shopper filter)
// ======================================================

async function listPublicBrandsWithProducts() {
  const brands = await prisma.brand.findMany({
    where: { products: { some: {} } },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    productCount: b._count.products,
  }));
}

// Public — roles of a specific brand (for teammate registration)
async function getPublicBrandRoles(brandId) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true },
  });
  if (!brand) {
    const err = new Error('Brand not found');
    err.status = 404;
    throw err;
  }

  const roles = await prisma.brandTeamRole.findMany({
    where: { brandId, isOwnerRole: false },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return roles;
}


// ======================================================
// EXPORTS
// ======================================================

// module.exports = {
//   listBrands,
//   getBrand,
//   createBrand,
//   updateBrand,
//   deleteBrand,
//   listPublicBrandsAll,
//   listPublicBrandsWithProducts,
// };


module.exports = {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  listPublicBrandsAll,
  listPublicBrandsWithProducts,
  getPublicBrandRoles,
};