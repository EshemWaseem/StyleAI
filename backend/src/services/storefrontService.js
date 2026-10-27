const prisma = require('../config/prisma');
const { notifyAdmins } = require('./notifications');

function shapeProduct(p) {
  const images = (p.images || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((img) => ({ id: img.id, url: img.url, position: img.position }));

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    category: p.category,
    price: p.price != null ? Number(p.price) : null,
    currency: p.currency,
    gender: p.gender,
    season: p.season,
    occasion: p.occasion,
    images,
    primaryImage: images[0]?.url ?? null,
    brand: p.brand,
  };
}

async function listHeroSlides() {
  const now = new Date();
  return prisma.storefrontHero.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
}

async function getEditorial() {
  return prisma.storefrontEditorial.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
}

async function listTopCreators() {
  const creators = await prisma.influencer.findMany({
    where: {
      status: 'ACTIVE',
      profileCompleted: true,
      avatarUrl: { not: null },
    },
    orderBy: { followerCount: 'desc' },
    take: 3,
    select: {
      id: true,
      slug: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      followerCount: true,
      engagementRate: true,
      country: true,
      categories: true,
    },
  });

  return creators.map((c) => ({
    id: c.id,
    slug: c.slug,
    displayName: c.displayName,
    username: c.username,
    avatarUrl: c.avatarUrl,
    followerCount: c.followerCount,
    engagementRate: c.engagementRate,
    country: c.country,
    categories: c.categories || [],
  }));
}

async function resolveSectionProducts(section) {
  if (section.type === 'MANUAL') {
    const links = await prisma.storefrontSectionProduct.findMany({
      where: { sectionId: section.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          include: {
            brand: { select: { id: true, name: true, slug: true, logoUrl: true, storefrontStatus: true } },
            images: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
    return links
      .map((l) => l.product)
      .filter((p) => p.storefrontVisible && p.brand?.storefrontStatus === 'APPROVED')
      .map((p) => {
        const { storefrontStatus, ...brandRest } = p.brand;
        return shapeProduct({ ...p, brand: brandRest });
      });
  }

  const baseWhere = {
    storefrontVisible: true,
    brand: { storefrontStatus: 'APPROVED' },
  };

  let orderBy = { createdAt: 'desc' };
  if (section.rule === 'trending') orderBy = { updatedAt: 'desc' };

  const products = await prisma.product.findMany({
    where: baseWhere,
    take: section.productLimit,
    orderBy,
    include: {
      brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
      images: { orderBy: { position: 'asc' } },
    },
  });
  return products.map(shapeProduct);
}

async function listActiveSections() {
  const sections = await prisma.storefrontSection.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const resolved = await Promise.all(
    sections.map(async (s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      type: s.type,
      layout: s.layout,
      rule: s.rule,
      productLimit: s.productLimit,
      sortOrder: s.sortOrder,
      products: await resolveSectionProducts(s),
    }))
  );

  return resolved.filter((s) => s.products.length > 0);
}

async function getStorefront() {
  const [hero, sections, editorial, creators] = await Promise.all([
    listHeroSlides(),
    listActiveSections(),
    getEditorial(),
    listTopCreators(),
  ]);
  return { hero, sections, editorial, creators };
}

async function resolveUserBrand(user) {
  if (!user.organizationId) {
    const err = new Error('You must belong to a brand to apply');
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

async function getMyBrandStorefrontStatus(user) {
  const brand = await resolveUserBrand(user);
  const counts = await prisma.product.groupBy({
    by: ['storefrontVisible'],
    where: { brandId: brand.id },
    _count: true,
  });
  const visibleCount = counts.find((c) => c.storefrontVisible)?._count ?? 0;
  const totalProducts = counts.reduce((s, c) => s + c._count, 0);

  return {
    brandId: brand.id,
    brandName: brand.name,
    status: brand.storefrontStatus,
    appliedAt: brand.storefrontAppliedAt,
    reviewedAt: brand.storefrontReviewedAt,
    declineReason: brand.storefrontDeclineReason,
    productCount: totalProducts,
    visibleProductCount: visibleCount,
    application: brand.storefrontApplication || null,
  };
}

async function applyForStorefront(user, payload = {}) {
  const brand = await resolveUserBrand(user);

  if (brand.storefrontStatus === 'APPROVED') {
    const err = new Error('Your brand is already approved for the storefront');
    err.status = 400;
    throw err;
  }
  if (brand.storefrontStatus === 'REQUESTED') {
    const err = new Error('Your application is already under review');
    err.status = 400;
    throw err;
  }

  const raw = Array.isArray(payload?.products) ? payload.products : [];
  if (raw.length === 0) {
    const err = new Error('Select at least one product for the storefront');
    err.status = 400;
    throw err;
  }

  const ids = raw.map((p) => p.id).filter(Boolean);
  const found = await prisma.product.findMany({
    where: { id: { in: ids }, brandId: brand.id },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    const err = new Error('One or more selected products are invalid');
    err.status = 400;
    throw err;
  }

  const VALID = ['ECOM', 'TRENDING', 'HERO'];
  const products = raw.map((p) => ({
    id: p.id,
    placement: VALID.includes(p.placement) ? p.placement : 'ECOM',
  }));

  const application = {
    products,
    notes: typeof payload?.notes === 'string' ? payload.notes.trim().slice(0, 500) : '',
  };

  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      storefrontStatus: 'REQUESTED',
      storefrontAppliedAt: new Date(),
      storefrontReviewedAt: null,
      storefrontReviewedBy: null,
      storefrontDeclineReason: null,
      storefrontApplication: application,
    },
  });

  notifyAdmins({
    type: 'SYSTEM',
    title: `Storefront application — ${brand.name}`,
    body: `${products.length} product${products.length === 1 ? '' : 's'} submitted for review.`,
    link: '/admin/storefront',
    meta: { brandId: brand.id },
    emailTemplate: 'brandApplicationReceived',
    emailData: {
      brandName: brand.name,
      productCount: products.length,
      notes: application.notes,
    },
  }).catch((e) => console.error('[storefront.apply.notify]', e.message));

  return getMyBrandStorefrontStatus(user);
}

async function withdrawApplication(user) {
  const brand = await resolveUserBrand(user);

  if (brand.storefrontStatus !== 'REQUESTED') {
    const err = new Error('No pending application to withdraw');
    err.status = 400;
    throw err;
  }

  await prisma.brand.update({
    where: { id: brand.id },
    data: {
      storefrontStatus: 'NOT_REQUESTED',
      storefrontAppliedAt: null,
      storefrontApplication: null,
    },
  });

  return getMyBrandStorefrontStatus(user);
}

async function toggleMyProductVisibility(user, productId, visible) {
  const brand = await resolveUserBrand(user);

  if (brand.storefrontStatus !== 'APPROVED') {
    const err = new Error('Your brand must be approved for the storefront before making products visible');
    err.status = 403;
    err.code = 'BRAND_NOT_APPROVED';
    throw err;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  if (product.brandId !== brand.id) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return prisma.product.update({
    where: { id: productId },
    data: { storefrontVisible: !!visible },
    select: { id: true, name: true, storefrontVisible: true },
  });
}

module.exports = {
  getStorefront,
  listHeroSlides,
  listActiveSections,
  getEditorial,
  listTopCreators,
  getMyBrandStorefrontStatus,
  applyForStorefront,
  withdrawApplication,
  toggleMyProductVisibility,
};