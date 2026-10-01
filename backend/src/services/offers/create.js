// services/offers/create.js
// ======================================================
// POST /api/offers — brand (or agency on behalf of brand) creates a DRAFT offer
// ======================================================

const prisma = require('../../config/prisma');
const {
  httpError,
  computeOfferTotals,
  shapeOffer,
} = require('./helpers');

async function createOffer(user, payload = {}) {
  const {
    brandId,
    influencerId,
    productId,
    items,
    title,
    brandNote,
    expiresAt,
  } = payload;

  if (!brandId) throw httpError('brandId is required', 400, 'MISSING_BRAND');
  if (!influencerId) throw httpError('influencerId is required', 400, 'MISSING_INFLUENCER');

  const [brand, influencer] = await Promise.all([
    prisma.brand.findUnique({ where: { id: brandId } }),
    prisma.influencer.findUnique({ where: { id: influencerId } }),
  ]);

  if (!brand) throw httpError('Brand not found', 404, 'BRAND_NOT_FOUND');
  if (!influencer) throw httpError('Influencer not found', 404, 'INFLUENCER_NOT_FOUND');

  // ------------------------------------------------------
  // Permission check
  // ------------------------------------------------------
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAgency = user.roles?.includes('AGENCY');

  if (isAdmin) {
    // Admins can create offers for any brand
  } else if (isAgency) {
    // Agency must have an active link to the brand's organization
    const link = await prisma.agencyClient.findFirst({
      where: {
        agencyOrganizationId: user.organizationId,
        clientOrganizationId: brand.organizationId,
        status: { not: 'COMPLETED' },
      },
    });
    if (!link) {
      throw httpError(
        'Forbidden: your agency does not manage this brand',
        403,
        'AGENCY_NO_ACCESS'
      );
    }
  } else if (user.organizationId !== brand.organizationId) {
    throw httpError('Forbidden: cannot create offer for this brand', 403, 'FORBIDDEN');
  }

  // ------------------------------------------------------
  // Product validation (optional)
  // ------------------------------------------------------
  let resolvedProductId = null;
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, brandId: true },
    });
    if (!product) {
      throw httpError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }
    if (product.brandId !== brandId) {
      throw httpError(
        'Product does not belong to this brand',
        400,
        'PRODUCT_BRAND_MISMATCH'
      );
    }
    resolvedProductId = product.id;
  }

  // ------------------------------------------------------
  // Bundle check — explicit false blocks multi-item offers
  // ------------------------------------------------------
  if (influencer.acceptsBundles === false && Array.isArray(items) && items.length > 1) {
    throw httpError(
      'This influencer does not accept bundled offers',
      400,
      'BUNDLES_NOT_ACCEPTED'
    );
  }

  // ------------------------------------------------------
  // Compute totals (fees, discounts, taxes)
  // ------------------------------------------------------
  const totals = await computeOfferTotals({
    items,
    currency: influencer.currency,
    influencer,
  });

  // ------------------------------------------------------
  // Agency attribution (only for AGENCY role, not admins)
  // ------------------------------------------------------
  const createdByAgencyId = isAgency && !isAdmin ? user.organizationId : null;

  // ------------------------------------------------------
  // Persist
  // ------------------------------------------------------
  const created = await prisma.customOffer.create({
    data: {
      brandId,
      influencerId,
      productId: resolvedProductId,
      createdByAgencyId,
      title: title ?? null,
      items: totals.items,
      subtotal: totals.subtotal,
      discountPct: totals.discountPct,
      discountAmount: totals.discountAmount,
      adminFeePct: totals.adminFeePct,
      adminFee: totals.adminFee,
      total: totals.total,
      currency: influencer.currency,
      brandNote: brandNote ?? null,
      createdBy: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: {
      product: true,
    },
  });

  return shapeOffer(created, { brand, influencer });
}

module.exports = { createOffer };