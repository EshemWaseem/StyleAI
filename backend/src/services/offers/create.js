// services/offers/create.js
// ======================================================
// POST /api/offers — brand creates offer → ESCROW → DIRECT TO INFLUENCER
// Status: DRAFT → PENDING (sent to influencer)
// ======================================================

const prisma = require('../../config/prisma');
const {
  httpError,
  computeOfferTotals,
  shapeOffer,
} = require('./helpers');
const { writeAudit } = require('../admin/helpers');
const { holdEscrowForOffer } = require('../wallet');
const { notifyUser } = require('../notifications');
const { emitOfferCreated } = require('../websocket/broadcast');

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
    if (!product) throw httpError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    if (product.brandId !== brandId) {
      throw httpError('Product does not belong to this brand', 400, 'PRODUCT_BRAND_MISMATCH');
    }
    resolvedProductId = product.id;
  }

  // ------------------------------------------------------
  // Bundle check
  // ------------------------------------------------------
  if (influencer.acceptsBundles === false && Array.isArray(items) && items.length > 1) {
    throw httpError(
      'This influencer does not accept bundled offers',
      400,
      'BUNDLES_NOT_ACCEPTED'
    );
  }

  // ------------------------------------------------------
  // Compute totals
  // ------------------------------------------------------
  const totals = await computeOfferTotals({
    items,
    currency: influencer.currency,
    influencer,
  });

  const createdByAgencyId = isAgency && !isAdmin ? user.organizationId : null;

  // ------------------------------------------------------
  // Step 1 — Create offer as DRAFT (for escrow reference)
  // ------------------------------------------------------
  let created = await prisma.customOffer.create({
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
      status: 'DRAFT',
    },
    include: { product: true },
  });

  // ------------------------------------------------------
  // Step 2 — Hold escrow from brand wallet
  // ------------------------------------------------------
  try {
    await holdEscrowForOffer(user.id, created.id);
  } catch (escrowErr) {
    console.warn(
      `[offers.createOffer] escrow hold failed for offer ${created.id}:`,
      escrowErr.message
    );
    throw httpError(
      escrowErr.message || 'Insufficient wallet balance to fund this offer',
      400,
      'ESCROW_HOLD_FAILED'
    );
  }

  // ------------------------------------------------------
  // Step 3 — Flip to PENDING (sent to influencer)
  // ------------------------------------------------------
  created = await prisma.customOffer.update({
    where: { id: created.id },
    data: { status: 'PENDING' },
    include: { product: true },
  });

  // ------------------------------------------------------
  // Step 4 — Notify influencer (in-app + email)
  // ------------------------------------------------------
  if (influencer.userId) {
    try {
      await notifyUser(influencer.userId, {
        type: 'OFFER_SUBMITTED',
        title: 'New offer received',
        body: `${brand.name} sent you an offer — ${influencer.currency} ${totals.total.toFixed(2)}`,
        link: `/offers/${created.id}`,
        meta: { offerId: created.id, brandId, total: totals.total },
        emailTemplate: 'offerReceived',
        emailData: {
          influencerName: influencer.displayName,
          brandName: brand.name,
          offerTitle: created.title || `Offer #${created.id.slice(0, 8)}`,
          amount: totals.total,
          currency: influencer.currency,
        },
      });
    } catch (notifyErr) {
      console.warn('[offers.createOffer] influencer notify failed:', notifyErr.message);
    }
  }

  // ------------------------------------------------------
  // Step 5 — Audit
  // ------------------------------------------------------
  await writeAudit({
    actorId: user.id,
    action: 'offer.create',
    targetType: 'CustomOffer',
    targetId: created.id,
    meta: {
      status: 'PENDING',
      escrowHeld: Number(totals.total),
      currency: influencer.currency,
      directToInfluencer: true,
    },
  });

    //  Real-time: notify influencer
  await emitOfferCreated({
    id: created.id,
    status: created.status,
    title: created.title,
    influencer: { userId: influencer.userId },
    brand: { organizationId: brand.organizationId },
    createdByAgencyId,
  }).catch((e) => console.warn('[emitOfferCreated] failed:', e.message));

  return shapeOffer(created, { brand, influencer });
}

module.exports = { createOffer };