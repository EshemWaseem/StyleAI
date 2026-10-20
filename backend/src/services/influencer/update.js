// services/influencer/update.js
const prisma = require('../../config/prisma');
const {
  shapeInfluencer,
  httpError,
  cleanHandle,
  cleanUsername,
  validateIntField,
  validateFloatField,
  validatePriceField,
} = require('./helpers');
const { validatePricingTiers } = require('../pricing');
const matchingCache = require('../matching/cache');

const STRING_FIELDS = [
  'displayName', 'bio', 'avatarUrl', 'email', 'phone',
  'country', 'city', 'language', 'gender', 'ageGroup',
  'currency', 'availability',
];

function checkPermission(user, influencer) {
  const isSelf = influencer.userId === user.id;
  if (!isSelf) {
    throw httpError(
      'Forbidden: only the influencer owner can edit this profile',
      403,
      'NOT_OWNER'
    );
  }
  if (!user.permissions?.includes('influencer.update')) {
    throw httpError('Forbidden: missing influencer.update permission', 403, 'FORBIDDEN');
  }
}

function buildUpdateData(data) {
  const update = {};
  for (const key of STRING_FIELDS) {
    if (data[key] !== undefined) update[key] = data[key] ?? null;
  }

  if (data.followerCount !== undefined) update.followerCount = validateIntField(data.followerCount, 'Follower count', 0) ?? 0;
  if (data.followingCount !== undefined) update.followingCount = validateIntField(data.followingCount, 'Following count', 0) ?? 0;
  if (data.avgViews !== undefined) update.avgViews = validateIntField(data.avgViews, 'Average views', 0) ?? 0;
  if (data.avgLikes !== undefined) update.avgLikes = validateIntField(data.avgLikes, 'Average likes', 0) ?? 0;
  if (data.avgComments !== undefined) update.avgComments = validateIntField(data.avgComments, 'Average comments', 0) ?? 0;
  if (data.engagementRate !== undefined) update.engagementRate = validateFloatField(data.engagementRate, 'Engagement rate', 0, 1) ?? 0;
  if (data.pricePerPost !== undefined) update.pricePerPost = validatePriceField(data.pricePerPost, 'Price per post', 0);
  if (data.categories !== undefined) update.categories = Array.isArray(data.categories) ? data.categories : [];
  if (data.audienceFavorites !== undefined) update.audienceFavorites = Array.isArray(data.audienceFavorites) ? data.audienceFavorites : [];
  if (data.pricingTiers !== undefined) update.pricingTiers = validatePricingTiers(data.pricingTiers);
  if (data.portfolio !== undefined) update.portfolio = data.portfolio;

  if (data.minBudget !== undefined) {
    update.minBudget = data.minBudget === null ? null : validatePriceField(data.minBudget, 'Minimum budget', 0);
  }
  if (data.acceptsBundles !== undefined) {
    if (data.acceptsBundles === null) update.acceptsBundles = null;
    else if (typeof data.acceptsBundles === 'boolean') update.acceptsBundles = data.acceptsBundles;
    else throw httpError('acceptsBundles must be true, false, or null', 400, 'INVALID_ACCEPTS_BUNDLES');
  }

  return update;
}

async function updateUsername(username, existing) {
  const clean = cleanUsername(username);
  if (!clean || clean === existing.username) return null;
  const conflict = await prisma.influencer.findUnique({ where: { username: clean } });
  if (conflict) throw httpError('Username already taken', 409);
  return clean;
}

// NEW: build full social-account record from scraper-enhanced input
function buildSocialAccountRecord(influencerId, s) {
  const scrapeData =
    s.scrapeData && typeof s.scrapeData === 'object'
      ? s.scrapeData
      : s.recentPosts
      ? { recentPosts: s.recentPosts }
      : null;

  return {
    influencerId,
    platform: s.platform,
    platformCustom: s.platform === 'OTHER' ? s.platformCustom || 'Other' : null,
    handle: cleanHandle(s.handle),
    profileUrl: s.profileUrl ?? null,
    followerCount: validateIntField(s.followerCount, 'Social follower count', 0) ?? 0,
    followingCount: validateIntField(s.followingCount, 'Social following count', 0) ?? 0,
    engagementRate: validateFloatField(s.engagementRate, 'Social engagement rate', 0, 1) ?? 0,
    isPrimary: !!s.isPrimary,

    totalPosts: validateIntField(s.totalPosts, 'Total posts', 0) ?? 0,
    totalLikes: BigInt(validateIntField(s.totalLikes, 'Total likes', 0) ?? 0),
    totalComments: BigInt(validateIntField(s.totalComments, 'Total comments', 0) ?? 0),
    totalViews: BigInt(validateIntField(s.totalViews, 'Total views', 0) ?? 0),
    avgLikes: validateIntField(s.avgLikes, 'Avg likes', 0) ?? 0,
    avgComments: validateIntField(s.avgComments, 'Avg comments', 0) ?? 0,
    avgViews: validateIntField(s.avgViews, 'Avg views', 0) ?? 0,

    authenticityScore:
      s.authenticityScore != null
        ? Math.max(0, Math.min(100, Math.round(Number(s.authenticityScore))))
        : null,
    engagementHealth: s.engagementHealth || null,
    suspiciousFlags: Array.isArray(s.suspiciousFlags) ? s.suspiciousFlags : [],

    lastPostAt: s.lastPostAt ? new Date(s.lastPostAt) : null,
    scrapedAt: s.scrapedAt ? new Date(s.scrapedAt) : new Date(),

    scrapeData,
  };
}

async function replaceSocialAccounts(influencerId, accounts) {
  await prisma.influencerSocialAccount.deleteMany({ where: { influencerId } });
  if (!accounts.length) return;

  const records = accounts
    .filter((s) => s && s.platform && cleanHandle(s.handle))
    .map((s) => buildSocialAccountRecord(influencerId, s));

  if (records.length > 0) {
    await prisma.influencerSocialAccount.createMany({ data: records });
  }
}

async function upsertAudienceMetrics(influencerId, am) {
  const data = {
    ageDistribution: am.ageDistribution ?? null,
    genderDistribution: am.genderDistribution ?? null,
    topCountries: am.topCountries ?? null,
    interests: Array.isArray(am.interests) ? am.interests : [],
    audienceQuality: am.audienceQuality ?? null,
    fakeFollowerPct: am.fakeFollowerPct ?? null,
  };
  await prisma.influencerAudienceMetrics.upsert({
    where: { influencerId },
    update: data,
    create: { influencerId, ...data },
  });
}

async function updateInfluencer(user, influencerId, data = {}) {
  const existing = await prisma.influencer.findUnique({ where: { id: influencerId } });
  if (!existing) throw httpError('Influencer not found', 404);

  checkPermission(user, existing);

  const updateData = buildUpdateData(data);

  if (data.username !== undefined) {
    const newUsername = await updateUsername(data.username, existing);
    if (newUsername) updateData.username = newUsername;
  }

  if (Array.isArray(data.socialAccounts)) {
    await replaceSocialAccounts(influencerId, data.socialAccounts);
  }

  if (data.audienceMetrics && typeof data.audienceMetrics === 'object') {
    await upsertAudienceMetrics(influencerId, data.audienceMetrics);
  }

  const influencer = await prisma.influencer.update({
    where: { id: influencerId },
    data: updateData,
    include: { socialAccounts: true, audienceMetrics: true },
  });

  matchingCache.invalidateInfluencer(influencerId);

  return shapeInfluencer(influencer);
}

module.exports = { updateInfluencer };