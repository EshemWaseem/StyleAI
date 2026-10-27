const prisma = require('../../config/prisma');
const { assertSuperAdmin, httpError, writeAudit } = require('./helpers');
const { notifyUser } = require('../notifications');

async function listHero(adminUser) {
  assertSuperAdmin(adminUser);
  return prisma.storefrontHero.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
}

async function createHero(adminUser, data, req) {
  assertSuperAdmin(adminUser);
  if (!data?.imageUrl) throw httpError('imageUrl is required', 400);

  const hero = await prisma.storefrontHero.create({
    data: {
      imageUrl: data.imageUrl,
      headline: data.headline ?? null,
      subheading: data.subheading ?? null,
      ctaText: data.ctaText ?? null,
      ctaLink: data.ctaLink ?? null,
      sortOrder: Number(data.sortOrder ?? 0),
      isActive: data.isActive !== false,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    },
  });

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.hero.create',
    targetType: 'StorefrontHero',
    targetId: hero.id,
    meta: { headline: hero.headline },
    ipAddress: req?.ip,
  });

  return hero;
}

async function updateHero(adminUser, id, data, req) {
  assertSuperAdmin(adminUser);
  const existing = await prisma.storefrontHero.findUnique({ where: { id } });
  if (!existing) throw httpError('Hero not found', 404);

  const patch = {};
  const allowed = ['imageUrl', 'headline', 'subheading', 'ctaText', 'ctaLink'];
  for (const k of allowed) {
    if (data[k] !== undefined) patch[k] = data[k] ?? null;
  }
  if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder);
  if (data.isActive !== undefined) patch.isActive = !!data.isActive;
  if (data.startsAt !== undefined) patch.startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if (data.endsAt !== undefined) patch.endsAt = data.endsAt ? new Date(data.endsAt) : null;

  const hero = await prisma.storefrontHero.update({ where: { id }, data: patch });

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.hero.update',
    targetType: 'StorefrontHero',
    targetId: id,
    meta: patch,
    ipAddress: req?.ip,
  });

  return hero;
}

async function deleteHero(adminUser, id, req) {
  assertSuperAdmin(adminUser);
  const existing = await prisma.storefrontHero.findUnique({ where: { id } });
  if (!existing) throw httpError('Hero not found', 404);

  await prisma.storefrontHero.delete({ where: { id } });
  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.hero.delete',
    targetType: 'StorefrontHero',
    targetId: id,
    meta: { headline: existing.headline },
    ipAddress: req?.ip,
  });
  return { id };
}

async function listSections(adminUser) {
  assertSuperAdmin(adminUser);
  const sections = await prisma.storefrontSection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { products: true } } },
  });
  return sections.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    type: s.type,
    layout: s.layout,
    rule: s.rule,
    productLimit: s.productLimit,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
    productCount: s._count.products,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

async function getSection(adminUser, id) {
  assertSuperAdmin(adminUser);
  const section = await prisma.storefrontSection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { sortOrder: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              currency: true,
              category: true,
              storefrontVisible: true,
              brand: { select: { id: true, name: true, slug: true } },
              images: { orderBy: { position: 'asc' }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!section) throw httpError('Section not found', 404);

  return {
    ...section,
    products: section.products.map((p) => ({
      id: p.product.id,
      name: p.product.name,
      sku: p.product.sku,
      price: p.product.price != null ? Number(p.product.price) : null,
      currency: p.product.currency,
      category: p.product.category,
      storefrontVisible: p.product.storefrontVisible,
      brand: p.product.brand,
      primaryImage: p.product.images[0]?.url ?? null,
      sortOrder: p.sortOrder,
      linkId: p.id,
    })),
  };
}

async function createSection(adminUser, data, req) {
  assertSuperAdmin(adminUser);
  if (!data?.title?.trim()) throw httpError('title is required', 400);

  const type = data.type === 'AUTO' ? 'AUTO' : 'MANUAL';
  const layout = data.layout === 'CAROUSEL' ? 'CAROUSEL' : 'GRID';
  if (type === 'AUTO' && !data.rule) throw httpError('rule is required for AUTO sections', 400);

  const section = await prisma.storefrontSection.create({
    data: {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      type,
      layout,
      rule: type === 'AUTO' ? data.rule : null,
      productLimit: Number(data.productLimit ?? 8),
      sortOrder: Number(data.sortOrder ?? 0),
      isActive: data.isActive !== false,
    },
  });

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.section.create',
    targetType: 'StorefrontSection',
    targetId: section.id,
    meta: { title: section.title, type: section.type },
    ipAddress: req?.ip,
  });

  return section;
}

async function updateSection(adminUser, id, data, req) {
  assertSuperAdmin(adminUser);
  const existing = await prisma.storefrontSection.findUnique({ where: { id } });
  if (!existing) throw httpError('Section not found', 404);

  const patch = {};
  if (data.title !== undefined) patch.title = String(data.title).trim();
  if (data.subtitle !== undefined) patch.subtitle = data.subtitle?.trim() || null;
  if (data.type !== undefined) patch.type = data.type === 'AUTO' ? 'AUTO' : 'MANUAL';
  if (data.layout !== undefined) patch.layout = data.layout === 'CAROUSEL' ? 'CAROUSEL' : 'GRID';
  if (data.rule !== undefined) patch.rule = data.rule || null;
  if (data.productLimit !== undefined) patch.productLimit = Number(data.productLimit);
  if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder);
  if (data.isActive !== undefined) patch.isActive = !!data.isActive;

  const section = await prisma.storefrontSection.update({ where: { id }, data: patch });

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.section.update',
    targetType: 'StorefrontSection',
    targetId: id,
    meta: patch,
    ipAddress: req?.ip,
  });

  return section;
}

async function deleteSection(adminUser, id, req) {
  assertSuperAdmin(adminUser);
  const existing = await prisma.storefrontSection.findUnique({ where: { id } });
  if (!existing) throw httpError('Section not found', 404);

  await prisma.storefrontSection.delete({ where: { id } });
  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.section.delete',
    targetType: 'StorefrontSection',
    targetId: id,
    meta: { title: existing.title },
    ipAddress: req?.ip,
  });
  return { id };
}

async function setSectionProducts(adminUser, sectionId, productIds, req) {
  assertSuperAdmin(adminUser);
  const section = await prisma.storefrontSection.findUnique({ where: { id: sectionId } });
  if (!section) throw httpError('Section not found', 404);
  if (section.type !== 'MANUAL') throw httpError('Only MANUAL sections accept product picks', 400);

  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
  if (ids.length > 0) {
    const found = await prisma.product.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw httpError('One or more products not found', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.storefrontSectionProduct.deleteMany({ where: { sectionId } });
    if (ids.length > 0) {
      await tx.storefrontSectionProduct.createMany({
        data: ids.map((productId, i) => ({ sectionId, productId, sortOrder: i })),
      });
    }
  });

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.section.setProducts',
    targetType: 'StorefrontSection',
    targetId: sectionId,
    meta: { count: ids.length },
    ipAddress: req?.ip,
  });

  return { sectionId, count: ids.length };
}

async function listBrandsWithStatus(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { search, status } = filters;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.storefrontStatus = status;

  const brands = await prisma.brand.findMany({
    where,
    orderBy: [{ storefrontAppliedAt: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      storefrontStatus: true,
      storefrontAppliedAt: true,
      storefrontReviewedAt: true,
      storefrontReviewedBy: true,
      storefrontDeclineReason: true,
      storefrontApplication: true,
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    storefrontStatus: b.storefrontStatus,
    appliedAt: b.storefrontAppliedAt,
    reviewedAt: b.storefrontReviewedAt,
    reviewedBy: b.storefrontReviewedBy,
    declineReason: b.storefrontDeclineReason,
    application: b.storefrontApplication || null,
    organization: b.organization,
    productCount: b._count.products,
  }));
}

async function findBrandOwners(brandId) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { organizationId: true },
  });
  if (!brand) return [];

  return prisma.user.findMany({
    where: {
      organizationId: brand.organizationId,
      isActive: true,
      userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
    },
    select: { id: true },
  });
}

async function reviewBrandApplication(adminUser, brandId, approve, reason, req) {
  assertSuperAdmin(adminUser);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw httpError('Brand not found', 404);
  if (brand.storefrontStatus !== 'REQUESTED') {
    throw httpError('No pending application for this brand', 400);
  }

  const shouldDecline = approve === false;
  const application = brand.storefrontApplication || {};
  const appliedProducts = Array.isArray(application.products) ? application.products : [];
  const appliedIds = appliedProducts.map((p) => p.id).filter(Boolean);

  await prisma.$transaction(async (tx) => {
    await tx.brand.update({
      where: { id: brandId },
      data: {
        storefrontStatus: shouldDecline ? 'DECLINED' : 'APPROVED',
        storefrontReviewedAt: new Date(),
        storefrontReviewedBy: adminUser.id,
        storefrontDeclineReason: shouldDecline ? (reason?.trim() || null) : null,
      },
    });

    if (shouldDecline) {
      await tx.product.updateMany({
        where: { brandId },
        data: { storefrontVisible: false },
      });
    } else {
      if (appliedIds.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: appliedIds }, brandId },
          data: { storefrontVisible: true },
        });
      }
    }
  });

  await writeAudit({
    actorId: adminUser.id,
    action: shouldDecline ? 'storefront.brand.decline' : 'storefront.brand.approve',
    targetType: 'Brand',
    targetId: brandId,
    meta: { brandName: brand.name, reason: reason ?? null, products: appliedIds.length },
    ipAddress: req?.ip,
  });

  findBrandOwners(brandId)
    .then((owners) => {
      for (const owner of owners) {
        notifyUser(owner.id, {
          type: 'SYSTEM',
          title: shouldDecline
            ? `Storefront application for ${brand.name} was not approved`
            : `🎉 ${brand.name} is live on StyleAI`,
          body: shouldDecline
            ? (reason?.trim() || 'You can update your products and re-apply anytime.')
            : `${appliedIds.length} product${appliedIds.length === 1 ? '' : 's'} are now visible on the public storefront.`,
          link: shouldDecline ? '/dashboard' : '/products',
          meta: {
            brandId: brand.id,
            event: shouldDecline ? 'STOREFRONT_DECLINED' : 'STOREFRONT_APPROVED',
            status: shouldDecline ? 'DECLINED' : 'APPROVED',
          },
          emailTemplate: shouldDecline ? 'brandApplicationDeclined' : 'brandApplicationApproved',
          emailData: shouldDecline
            ? { brandName: brand.name, reason: reason?.trim() || '' }
            : { brandName: brand.name, productCount: appliedIds.length },
        }).catch((e) => console.error('[notify.brand-review]', e.message));
      }
    })
    .catch((e) => console.error('[findBrandOwners]', e.message));

  return prisma.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      storefrontStatus: true,
      storefrontReviewedAt: true,
      storefrontReviewedBy: true,
      storefrontDeclineReason: true,
    },
  });
}

async function revokeBrandOptIn(adminUser, brandId, reason, req) {
  assertSuperAdmin(adminUser);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw httpError('Brand not found', 404);

  await prisma.$transaction([
    prisma.brand.update({
      where: { id: brandId },
      data: {
        storefrontStatus: 'NOT_REQUESTED',
        storefrontAppliedAt: null,
        storefrontReviewedAt: null,
        storefrontReviewedBy: null,
        storefrontDeclineReason: reason?.trim() || null,
        storefrontApplication: null,
      },
    }),
    prisma.product.updateMany({
      where: { brandId },
      data: { storefrontVisible: false },
    }),
  ]);

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.brand.revoke',
    targetType: 'Brand',
    targetId: brandId,
    meta: { brandName: brand.name, reason: reason ?? null },
    ipAddress: req?.ip,
  });

  return { id: brandId, storefrontStatus: 'NOT_REQUESTED' };
}

async function searchApprovedProducts(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { search, limit = 30 } = filters;

  const where = { brand: { storefrontStatus: 'APPROVED' } };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    take: Math.min(limit, 100),
    orderBy: { createdAt: 'desc' },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { position: 'asc' }, take: 1 },
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: p.price != null ? Number(p.price) : null,
    currency: p.currency,
    storefrontVisible: p.storefrontVisible,
    brand: p.brand,
    primaryImage: p.images[0]?.url ?? null,
  }));
}

async function getEditorial(adminUser) {
  assertSuperAdmin(adminUser);
  return prisma.storefrontEditorial.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
}

async function upsertEditorial(adminUser, data, req) {
  assertSuperAdmin(adminUser);
  if (!data?.title?.trim()) throw httpError('title is required', 400);
  const steps = Array.isArray(data.steps)
    ? data.steps.map((s) => String(s).trim()).filter(Boolean).slice(0, 12)
    : [];
  if (steps.length === 0) throw httpError('Provide at least one step', 400);

  const existing = await prisma.storefrontEditorial.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  let record;
  if (existing) {
    record = await prisma.storefrontEditorial.update({
      where: { id: existing.id },
      data: { title: data.title.trim(), steps, isActive: data.isActive !== false },
    });
  } else {
    record = await prisma.storefrontEditorial.create({
      data: { title: data.title.trim(), steps, isActive: data.isActive !== false },
    });
  }

  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.editorial.upsert',
    targetType: 'StorefrontEditorial',
    targetId: record.id,
    meta: { title: record.title, steps: steps.length },
    ipAddress: req?.ip,
  });

  return record;
}

async function deleteEditorial(adminUser, req) {
  assertSuperAdmin(adminUser);
  const existing = await prisma.storefrontEditorial.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  if (!existing) return { id: null };

  await prisma.storefrontEditorial.delete({ where: { id: existing.id } });
  await writeAudit({
    actorId: adminUser.id,
    action: 'storefront.editorial.delete',
    targetType: 'StorefrontEditorial',
    targetId: existing.id,
    meta: {},
    ipAddress: req?.ip,
  });

  return { id: existing.id };
}

module.exports = {
  listHero,
  createHero,
  updateHero,
  deleteHero,
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  setSectionProducts,
  listBrandsWithStatus,
  reviewBrandApplication,
  revokeBrandOptIn,
  searchApprovedProducts,
  getEditorial,
  upsertEditorial,
  deleteEditorial,
};