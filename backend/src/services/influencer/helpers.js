// services/influencer/helpers.js
const prisma = require('../../config/prisma');

const INT4_MAX = 2_147_483_647;
const INT4_MIN = -2_147_483_648;

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shapeSocialAccount(s) {
  if (!s) return null;

  return {
    id: s.id,
    platform: s.platform,
    platformCustom: s.platformCustom ?? null,
    handle: s.handle,
    profileUrl: s.profileUrl ?? null,
    followerCount: s.followerCount ?? 0,
    followingCount: s.followingCount ?? 0,
    engagementRate: s.engagementRate ?? 0,
    isPrimary: !!s.isPrimary,

    totalPosts: s.totalPosts ?? 0,
    totalLikes: s.totalLikes != null ? Number(s.totalLikes) : 0,
    totalComments: s.totalComments != null ? Number(s.totalComments) : 0,
    totalViews: s.totalViews != null ? Number(s.totalViews) : 0,
    avgLikes: s.avgLikes ?? 0,
    avgComments: s.avgComments ?? 0,
    avgViews: s.avgViews ?? 0,

    authenticityScore: s.authenticityScore ?? null,
    engagementHealth: s.engagementHealth ?? null,
    suspiciousFlags: Array.isArray(s.suspiciousFlags) ? s.suspiciousFlags : [],

    lastPostAt: s.lastPostAt ?? null,
    scrapedAt: s.scrapedAt ?? null,
    scrapeData: s.scrapeData ?? null,
  };
}

function shapeInfluencer(i, optsOrSavedSet = null) {
  let savedSet = null;
  let rating = null;
  let totalOrders = 0;

  if (optsOrSavedSet instanceof Set) {
    savedSet = optsOrSavedSet;
  } else if (optsOrSavedSet && typeof optsOrSavedSet === 'object') {
    savedSet = optsOrSavedSet.savedSet || null;
    rating = optsOrSavedSet.rating ?? null;
    totalOrders = optsOrSavedSet.totalOrders ?? 0;
  }

  // Calculate Profile Completeness (6 Key Fields)
  let filledFields = 0;
  const totalFields = 6;

  if (i.displayName) filledFields++;
  if (i.bio && i.bio.trim().length > 0) filledFields++;
  if (i.avatarUrl) filledFields++;
  if (i.categories && i.categories.length > 0) filledFields++;
  if (i.socialAccounts && i.socialAccounts.length > 0) filledFields++;
  if (i.pricePerPost != null || (i.pricingTiers && Object.keys(i.pricingTiers).length > 0)) filledFields++;

  const profileCompleteness = Math.round((filledFields / totalFields) * 100);

  return {
    id: i.id,
    userId: i.userId,
    displayName: i.displayName,
    username: i.username,
    slug: i.slug,
    bio: i.bio,
    avatarUrl: i.avatarUrl,

    rating,
    totalOrders,
    completedCampaigns: totalOrders,

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
    profileCompleteness, //  Dynamic completeness added

    socialAccounts: Array.isArray(i.socialAccounts)
      ? i.socialAccounts.map(shapeSocialAccount)
      : [],

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

async function getSavedSet(organizationId, influencerIds) {
  if (!organizationId || !influencerIds.length) return new Set();

  const rows = await prisma.organizationInfluencer.findMany({
    where: { organizationId, influencerId: { in: influencerIds } },
    select: { influencerId: true },
  });

  return new Set(rows.map((r) => r.influencerId));
}

async function getRatingMap(influencerIds) {
  const map = new Map();
  if (!influencerIds || influencerIds.length === 0) return map;

  for (const id of influencerIds) {
    map.set(id, { rating: null, totalOrders: 0 });
  }

  try {
    const grouped = await prisma.campaign.groupBy({
      by: ['influencerId'],
      where: {
        influencerId: { in: influencerIds },
        status: 'COMPLETED',
      },
      _count: { _all: true },
    });

    for (const row of grouped) {
      const total = row._count._all;
      let rating = null;
      if (total >= 1) {
        if (total >= 10) rating = 4.8;
        else if (total >= 6) rating = 4.6;
        else if (total >= 3) rating = 4.3;
        else rating = 4.0;
      }
      map.set(row.influencerId, { rating, totalOrders: total });
    }
  } catch (err) {
    console.warn('[influencer.helpers] getRatingMap failed:', err.message);
  }

  return map;
}

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

module.exports = {
  INT4_MAX,
  INT4_MIN,
  slugify,
  shapeInfluencer,
  shapeSocialAccount,
  requireField,
  httpError,
  cleanHandle,
  cleanUsername,
  validateIntField,
  validateFloatField,
  validatePriceField,
  getSavedSet,
  getRatingMap,
  ensureUniqueUsername,
  generateUniqueSlug,
};