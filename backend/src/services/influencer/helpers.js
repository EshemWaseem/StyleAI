// services/influencer/helpers.js
const prisma = require('../../config/prisma');

// ======================================================
// CONSTANTS
// ======================================================
const INT4_MAX = 2_147_483_647;
const INT4_MIN = -2_147_483_648;

// ======================================================
// SLUG
// ======================================================
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ======================================================
// SHAPE — clean API response
// ======================================================
function shapeInfluencer(i, savedSet = null) {
  return {
    id: i.id,
    userId: i.userId,
    displayName: i.displayName,
    username: i.username,
    slug: i.slug,
    bio: i.bio,
    avatarUrl: i.avatarUrl,
    email: i.email,
    phone: i.phone,
    country: i.country,
    city: i.city,
    language: i.language,
    gender: i.gender,
    ageGroup: i.ageGroup,
    followerCount: i.followerCount,
    followingCount: i.followingCount,
    engagementRate: i.engagementRate,
    categories: i.categories || [],
    audienceFavorites: i.audienceFavorites || [],
    avgViews: i.avgViews,
    avgLikes: i.avgLikes,
    avgComments: i.avgComments,
    pricePerPost: i.pricePerPost != null ? Number(i.pricePerPost) : null,
    minBudget: i.minBudget != null ? Number(i.minBudget) : null,
    acceptsBundles: i.acceptsBundles ?? null,
    currency: i.currency,
    availability: i.availability,
    status: i.status,
    pricingTiers: i.pricingTiers,
    portfolio: i.portfolio,
    fashionScore: i.fashionScore,
    luxuryScore: i.luxuryScore,
    beautyScore: i.beautyScore,
    lifestyleScore: i.lifestyleScore,
    profileCompleted: i.profileCompleted,
    socialAccounts: (i.socialAccounts || []).map((s) => ({
      id: s.id,
      platform: s.platform,
      platformCustom: s.platformCustom,
      handle: s.handle,
      profileUrl: s.profileUrl,
      followerCount: s.followerCount,
      followingCount: s.followingCount,
      engagementRate: s.engagementRate,
      isPrimary: s.isPrimary,
    })),
    audienceMetrics: i.audienceMetrics
      ? {
          ageDistribution: i.audienceMetrics.ageDistribution,
          genderDistribution: i.audienceMetrics.genderDistribution,
          topCountries: i.audienceMetrics.topCountries,
          interests: i.audienceMetrics.interests,
          audienceQuality: i.audienceMetrics.audienceQuality,
          fakeFollowerPct: i.audienceMetrics.fakeFollowerPct,
        }
      : null,
    isSaved: savedSet ? savedSet.has(i.id) : undefined,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

// ======================================================
// BASIC VALIDATORS
// ======================================================
function requireField(value, fieldName) {
  if (!value || !String(value).trim()) {
    const err = new Error(`${fieldName} is required`);
    err.status = 400;
    throw err;
  }
}

function httpError(message, status, code = null) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function cleanHandle(handle) {
  return String(handle || '')
    .trim()
    .replace(/^@/, '');
}

function cleanUsername(username) {
  return String(username)
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

// ======================================================
// NUMERIC VALIDATORS — friendly error messages
// ======================================================
function validateIntField(value, fieldName, min = 0) {
  if (value === undefined || value === null || value === '') return null;

  const num = Number(value);

  if (!Number.isFinite(num)) {
    throw httpError(`${fieldName} must be a valid number`, 400, 'INVALID_NUMBER');
  }
  if (!Number.isInteger(num)) {
    throw httpError(`${fieldName} must be a whole number (no decimals)`, 400, 'INVALID_INTEGER');
  }
  if (num < min) {
    throw httpError(`${fieldName} cannot be less than ${min.toLocaleString()}`, 400, 'VALUE_TOO_SMALL');
  }
  if (num > INT4_MAX) {
    throw httpError(
      `${fieldName} is too large. Maximum allowed is ${INT4_MAX.toLocaleString()}. You entered ${num.toLocaleString()}.`,
      400,
      'VALUE_TOO_LARGE'
    );
  }
  return num;
}

function validateFloatField(value, fieldName, min = 0, max = null) {
  if (value === undefined || value === null || value === '') return null;

  const num = Number(value);

  if (!Number.isFinite(num)) {
    throw httpError(`${fieldName} must be a valid number`, 400, 'INVALID_NUMBER');
  }
  if (num < min) {
    throw httpError(`${fieldName} cannot be less than ${min}`, 400, 'VALUE_TOO_SMALL');
  }
  if (max !== null && num > max) {
    throw httpError(`${fieldName} cannot be more than ${max}`, 400, 'VALUE_TOO_LARGE');
  }
  return num;
}

function validatePriceField(value, fieldName, min = 0) {
  if (value === undefined || value === null || value === '') return null;

  const num = Number(value);

  if (!Number.isFinite(num)) {
    throw httpError(`${fieldName} must be a valid number`, 400, 'INVALID_NUMBER');
  }
  if (num < min) {
    throw httpError(`${fieldName} cannot be less than ${min}`, 400, 'VALUE_TOO_SMALL');
  }
  if (num > 99_999_999.99) {
    throw httpError(`${fieldName} is too large.`, 400, 'VALUE_TOO_LARGE');
  }
  return Math.round(num * 100) / 100;
}

// ======================================================
// SAVED INFLUENCERS
// ======================================================
async function getSavedSet(organizationId, influencerIds) {
  if (!organizationId || !influencerIds.length) return new Set();

  const rows = await prisma.organizationInfluencer.findMany({
    where: { organizationId, influencerId: { in: influencerIds } },
    select: { influencerId: true },
  });

  return new Set(rows.map((r) => r.influencerId));
}

// ======================================================
// UNIQUE USERNAME / SLUG
// ======================================================
async function ensureUniqueUsername(username) {
  const existing = await prisma.influencer.findUnique({ where: { username } });
  if (existing) {
    throw httpError('Username already taken', 409, 'USERNAME_EXISTS');
  }
}

async function generateUniqueSlug(displayName, username) {
  const base = slugify(displayName || username);
  let slug = base;
  let counter = 1;
  while (await prisma.influencer.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  INT4_MAX,
  INT4_MIN,
  slugify,
  shapeInfluencer,
  requireField,
  httpError,
  cleanHandle,
  cleanUsername,
  validateIntField,
  validateFloatField,
  validatePriceField,
  getSavedSet,
  ensureUniqueUsername,
  generateUniqueSlug,
};