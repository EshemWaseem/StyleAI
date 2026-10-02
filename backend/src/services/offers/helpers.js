// services/offers/helpers.js
// ======================================================
// Shared offer utilities — validation, totals, shaping
// ======================================================

const prisma = require('../../config/prisma');
const { getAllSettings, parsePagination } = require('../admin/helpers');
const {
  httpError,
  validatePriceField,
  validateIntField,
} = require('../influencer/helpers');
const {
  getPlatform,
  isValidContentType,
} = require('../../config/platformCatalog');

// ------------------------------------------------------
// Finance rules resolver
// ------------------------------------------------------
async function getFinanceRules() {
  const all = await getAllSettings();
  return all.finance || {};
}

// ------------------------------------------------------
// Validate ONE offer line item
// ------------------------------------------------------
function validateOfferItem(item, index) {
  if (!item || typeof item !== 'object') {
    throw httpError(`items[${index}] must be an object`, 400, 'INVALID_ITEM');
  }

  const platform = String(item.platform || '').toUpperCase();
  const cfg = getPlatform(platform);
  if (!cfg) {
    throw httpError(`items[${index}]: unknown platform "${item.platform}"`, 400, 'UNKNOWN_PLATFORM');
  }

  const contentType = String(item.contentType || '').toLowerCase();
  if (!isValidContentType(platform, contentType)) {
    throw httpError(
      `items[${index}]: content type "${contentType}" not supported on ${cfg.label}`,
      400,
      'INVALID_CONTENT_TYPE'
    );
  }

  const quantity = validateIntField(item.quantity ?? 1, `items[${index}].quantity`, 1) ?? 1;
  const unitPrice = validatePriceField(item.unitPrice, `items[${index}].unitPrice`, 0);

  if (unitPrice === null) {
    throw httpError(`items[${index}].unitPrice is required`, 400, 'MISSING_UNIT_PRICE');
  }

  const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
  const label = item.label || `${cfg.label} ${contentType}`;

  return { platform, contentType, quantity, unitPrice, lineTotal, label };
}

// ------------------------------------------------------
// Full offer math
// ------------------------------------------------------
async function computeOfferTotals({ items, currency, influencer }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('Offer must contain at least one item', 400, 'EMPTY_OFFER');
  }

  const cleanedItems = items.map((it, i) => validateOfferItem(it, i));
  const subtotal = Math.round(
    cleanedItems.reduce((s, it) => s + it.lineTotal, 0) * 100
  ) / 100;

  const finance = await getFinanceRules();

  const threshold = Number(finance.bulkDiscountThreshold ?? 0);
  const discountPct = Number(finance.bulkDiscountPct ?? 0);
  const totalQty = cleanedItems.reduce((s, it) => s + it.quantity, 0);
  const appliedDiscountPct =
    threshold > 0 && totalQty >= threshold ? discountPct : 0;
  const discountAmount = Math.round(subtotal * (appliedDiscountPct / 100) * 100) / 100;

  const adminFeePct = Number(finance.brandCommissionPct ?? 0);
  const preFee = subtotal - discountAmount;
  const adminFee = Math.round(preFee * (adminFeePct / 100) * 100) / 100;

  const total = Math.round((preFee + adminFee) * 100) / 100;

  if (influencer?.minBudget != null) {
    const minBudget = Number(influencer.minBudget);
    if (total < minBudget) {
      throw httpError(
        `Offer total (${currency} ${total.toFixed(2)}) is below the influencer's minimum budget (${currency} ${minBudget.toFixed(2)})`,
        400,
        'BELOW_MIN_BUDGET'
      );
    }
  }

  return {
    items: cleanedItems,
    subtotal,
    discountPct: appliedDiscountPct,
    discountAmount,
    adminFeePct,
    adminFee,
    total,
  };
}

// ------------------------------------------------------
// API shaping — includes ownership IDs so frontend can
// compute per-viewer permissions
// ------------------------------------------------------
function shapeOffer(offer, { brand, influencer } = {}) {
  return {
    id: offer.id,
    brandId: offer.brandId,
    influencerId: offer.influencerId,
    title: offer.title,
    items: offer.items,
    subtotal: Number(offer.subtotal),
    discountPct: offer.discountPct,
    discountAmount: Number(offer.discountAmount),
    adminFeePct: offer.adminFeePct,
    adminFee: Number(offer.adminFee),
    total: Number(offer.total),
    currency: offer.currency,
    status: offer.status,
    brandNote: offer.brandNote,
    adminNote: offer.adminNote,
    influencerNote: offer.influencerNote,
    createdBy: offer.createdBy,
    reviewedBy: offer.reviewedBy,
    reviewedAt: offer.reviewedAt,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    brand: brand
      ? {
          id: brand.id,
          organizationId: brand.organizationId,   // ← ADDED (for ownership check)
          name: brand.name,
          slug: brand.slug,
          logoUrl: brand.logoUrl,
        }
      : undefined,
    influencer: influencer
      ? {
          id: influencer.id,
          userId: influencer.userId,              // ← ADDED (for ownership check)
          displayName: influencer.displayName,
          username: influencer.username,
          slug: influencer.slug,
          avatarUrl: influencer.avatarUrl,
          currency: influencer.currency,
        }
      : undefined,
  };
}

module.exports = {
  getFinanceRules,
  validateOfferItem,
  computeOfferTotals,
  shapeOffer,
  parsePagination,
  httpError,
};