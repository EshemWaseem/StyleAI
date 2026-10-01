// services/listings/index.js
// ======================================================
// Influencer public listings — create, browse, claim
// ======================================================

const prisma = require('../../config/prisma');
const { getAllSettings, parsePagination, writeAudit } = require('../admin/helpers');
const { httpError, validateIntField, validatePriceField } = require('../influencer/helpers');
const { getPlatform, isValidContentType } = require('../../config/platformCatalog');
const { notifyUser } = require('../notifications');
// ------------------------------------------------------
// Validate a single listing line item
// ------------------------------------------------------
function validateItem(item, i) {
  if (!item || typeof item !== 'object') {
    throw httpError(`items[${i}] invalid`, 400, 'INVALID_ITEM');
  }
  const platform = String(item.platform || '').toUpperCase();
  const cfg = getPlatform(platform);
  if (!cfg) throw httpError(`items[${i}]: unknown platform "${item.platform}"`, 400, 'UNKNOWN_PLATFORM');

  const contentType = String(item.contentType || '').toLowerCase();
  if (!isValidContentType(platform, contentType)) {
    throw httpError(`items[${i}]: "${contentType}" not supported on ${cfg.label}`, 400, 'INVALID_CONTENT_TYPE');
  }

  const quantity = validateIntField(item.quantity ?? 1, `items[${i}].quantity`, 1) ?? 1;
  const unitPrice = validatePriceField(item.unitPrice, `items[${i}].unitPrice`, 0);
  if (unitPrice === null) throw httpError(`items[${i}].unitPrice is required`, 400, 'MISSING_PRICE');

  const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
  return {
    platform,
    contentType,
    quantity,
    unitPrice,
    lineTotal,
    label: item.label || `${cfg.label} ${contentType}`,
  };
}

// ------------------------------------------------------
// API shaping
// ------------------------------------------------------
function shapeListing(l, { influencer } = {}) {
  return {
    id: l.id,
    influencerId: l.influencerId,
    title: l.title,
    description: l.description,
    coverImageUrl: l.coverImageUrl,
    items: l.items,
    subtotal: Number(l.subtotal),
    currency: l.currency,
    validDays: l.validDays,
    expiresAt: l.expiresAt,
    status: l.status,
    viewCount: l.viewCount,
    claimCount: l.claimCount,
    claimedByBrandId: l.claimedByBrandId,
    claimedAt: l.claimedAt,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    influencer: influencer
      ? {
          id: influencer.id,
          displayName: influencer.displayName,
          username: influencer.username,
          slug: influencer.slug,
          avatarUrl: influencer.avatarUrl,
          categories: influencer.categories,
          followerCount: influencer.followerCount,
          engagementRate: influencer.engagementRate,
        }
      : undefined,
  };
}

// ------------------------------------------------------
// Auto-expire stale listings (call before listing)
// ------------------------------------------------------
async function expireStaleListings() {
  try {
    await prisma.influencerListing.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  } catch (err) {
    // Non-fatal
    console.error('[listings] expire failed:', err.message);
  }
}

// ------------------------------------------------------
// CREATE — influencer only
// ------------------------------------------------------
async function createListing(user, payload = {}) {
  const influencer = await prisma.influencer.findUnique({ where: { userId: user.id } });
  if (!influencer) {
    throw httpError('No influencer profile linked to your account', 403, 'NOT_INFLUENCER');
  }

  const { title, description, coverImageUrl, items, validDays } = payload;

  if (!title || String(title).trim().length < 3) {
    throw httpError('title must be at least 3 characters', 400, 'INVALID_TITLE');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('At least one item required', 400, 'EMPTY_ITEMS');
  }

  const cleanedItems = items.map((it, i) => validateItem(it, i));
  const subtotal = Math.round(cleanedItems.reduce((s, it) => s + it.lineTotal, 0) * 100) / 100;

  const days = validateIntField(validDays ?? 7, 'validDays', 1) ?? 7;
  if (days > 365) throw httpError('validDays cannot exceed 365', 400, 'TOO_LONG');

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const listing = await prisma.influencerListing.create({
    data: {
      influencerId: influencer.id,
      title: String(title).trim(),
      description: description ?? null,
      coverImageUrl: coverImageUrl ?? null,
      items: cleanedItems,
      subtotal,
      currency: influencer.currency || 'USD',
      validDays: days,
      expiresAt,
      status: 'ACTIVE',
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'listing.create',
    targetType: 'InfluencerListing',
    targetId: listing.id,
    meta: { title: listing.title, subtotal, validDays: days },
  });

  return shapeListing(listing, { influencer });
}

// ------------------------------------------------------
// LIST — role-aware
// ------------------------------------------------------
async function listListings(user, query = {}) {
  await expireStaleListings();

  const { limit, offset } = parsePagination(query);
  const now = new Date();
  const where = {};

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isInfluencer = user.roles?.includes('INFLUENCER');

  if (isInfluencer && !query.all) {
    // Influencer sees their own listings (all statuses)
    const inf = await prisma.influencer.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!inf) return { listings: [], total: 0, limit, offset };

    where.influencerId = inf.id;
    if (query.status) where.status = query.status;
  } else if (isAdmin && query.all) {
    // Admin sees all
    if (query.status) where.status = query.status;
  } else {
    // Brands (and everyone else) see only active non-expired
    where.status = 'ACTIVE';
    where.expiresAt = { gt: now };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.influencerListing.findMany({
      where,
      include: { influencer: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.influencerListing.count({ where }),
  ]);

  return {
    listings: rows.map((r) => shapeListing(r, { influencer: r.influencer })),
    total,
    limit,
    offset,
  };
}

// ------------------------------------------------------
// GET one
// ------------------------------------------------------
async function getListing(user, id) {
  const l = await prisma.influencerListing.findUnique({
    where: { id },
    include: { influencer: true },
  });
  if (!l) throw httpError('Listing not found', 404, 'NOT_FOUND');

  // Best-effort view counter — never blocks
  prisma.influencerListing
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return shapeListing(l, { influencer: l.influencer });
}

// ------------------------------------------------------
// CANCEL — owner or admin
// ------------------------------------------------------
async function cancelListing(user, id) {
  const l = await prisma.influencerListing.findUnique({
    where: { id },
    include: { influencer: true },
  });
  if (!l) throw httpError('Listing not found', 404, 'NOT_FOUND');

  const isOwner = l.influencer.userId === user.id;
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (!isOwner && !isAdmin) throw httpError('Forbidden', 403, 'FORBIDDEN');

  if (l.status !== 'ACTIVE') {
    throw httpError(`Cannot cancel a ${l.status} listing`, 400, 'NOT_CANCELLABLE');
  }

  const updated = await prisma.influencerListing.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: { influencer: true },
  });

  await writeAudit({
    actorId: user.id,
    action: 'listing.cancel',
    targetType: 'InfluencerListing',
    targetId: id,
  });

  return shapeListing(updated, { influencer: updated.influencer });
}

// ------------------------------------------------------
// CLAIM — brand claims listing → creates DRAFT CustomOffer
// ------------------------------------------------------
async function claimListing(user, listingId, payload = {}) {
  const { brandId } = payload;
  if (!brandId) throw httpError('brandId required', 400, 'MISSING_BRAND');

  const [listing, brand] = await Promise.all([
    prisma.influencerListing.findUnique({
      where: { id: listingId },
      include: { influencer: true },
    }),
    prisma.brand.findUnique({ where: { id: brandId } }),
  ]);

  if (!listing) throw httpError('Listing not found', 404, 'NOT_FOUND');
  if (!brand) throw httpError('Brand not found', 404, 'BRAND_NOT_FOUND');

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (!isAdmin && user.organizationId !== brand.organizationId) {
    throw httpError('Forbidden: brand not in your organization', 403, 'FORBIDDEN');
  }

  if (listing.status !== 'ACTIVE') {
    throw httpError(`Listing is ${listing.status}`, 400, 'NOT_ACTIVE');
  }
  if (new Date(listing.expiresAt) < new Date()) {
    throw httpError('Listing has expired', 400, 'EXPIRED');
  }

  // Pull finance rules from DB (fallback to config defaults)
  const all = await getAllSettings();
  const finance = all.finance || {};
  const subtotal = Number(listing.subtotal);
  const adminFeePct = Number(finance.brandCommissionPct ?? 5);
  const adminFee = Math.round(subtotal * (adminFeePct / 100) * 100) / 100;
  const total = Math.round((subtotal + adminFee) * 100) / 100;

  // Create a DRAFT CustomOffer from the listing
  const offer = await prisma.customOffer.create({
    data: {
      brandId: brand.id,
      influencerId: listing.influencerId,
      title: listing.title,
      items: listing.items,
      subtotal,
      discountPct: 0,
      discountAmount: 0,
      adminFeePct,
      adminFee,
      total,
      currency: listing.currency,
      status: 'DRAFT',
      brandNote: `Claimed from listing "${listing.title}"`,
      createdBy: user.id,
    },
    include: { brand: true, influencer: true },
  });

  // Mark listing as claimed
  await prisma.influencerListing.update({
    where: { id: listingId },
    data: {
      status: 'CLAIMED',
      claimedByBrandId: brand.id,
      claimedAt: new Date(),
      claimCount: { increment: 1 },
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'listing.claim',
    targetType: 'InfluencerListing',
    targetId: listingId,
    meta: { offerId: offer.id, brandId: brand.id, total },
  });

    // Notify the influencer
  if (listing.influencer.userId) {
    await notifyUser(listing.influencer.userId, {
      type: 'LISTING_CLAIMED',
      title: 'Your offer was claimed',
      body: `${brand.name} claimed "${listing.title}".`,
      link: `/offers/${offer.id}`,
      meta: { listingId, offerId: offer.id, brandId: brand.id },
    });
  }

  return {
    listing: shapeListing(listing, { influencer: listing.influencer }),
    offerId: offer.id,
    offer: {
      id: offer.id,
      status: offer.status,
      subtotal: Number(offer.subtotal),
      adminFee: Number(offer.adminFee),
      total: Number(offer.total),
      currency: offer.currency,
    },
  };
}

module.exports = {
  createListing,
  listListings,
  getListing,
  cancelListing,
  claimListing,
};