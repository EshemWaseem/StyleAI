// services/influencer/create.js
const prisma = require('../../config/prisma');
const {
  shapeInfluencer,
  requireField,
  cleanUsername,
  cleanHandle,
  ensureUniqueUsername,
  generateUniqueSlug,
  validateIntField,
  validateFloatField,
  validatePriceField,
  httpError,
} = require('./helpers');

// NEW: build a full social-account record from scraper-enhanced input
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

async function createInfluencer(user, data = {}) {
  if (!user || !user.id) throw httpError('Unauthorized', 401, 'NO_USER');

  const roles = user.roles || [];
  const isInfluencer = roles.includes('INFLUENCER');
  const isAdmin = roles.includes('SUPER_ADMIN');
  if (!isInfluencer && !isAdmin) {
    throw httpError(
      'Only influencer accounts can create an influencer profile',
      403,
      'NOT_INFLUENCER_ROLE'
    );
  }

  const existingForUser = await prisma.influencer.findUnique({
    where: { userId: user.id },
    select: { id: true, username: true },
  });
  if (existingForUser) {
    throw httpError('You already have an influencer profile', 409, 'PROFILE_EXISTS');
  }

  const {
    displayName, username, bio, avatarUrl, email, phone,
    country, city, language, gender, ageGroup,
    followerCount, followingCount, engagementRate,
    categories, audienceFavorites,
    avgViews, avgLikes, avgComments,
    pricePerPost, currency, availability, pricingTiers, portfolio,
    socialAccounts, audienceMetrics,
  } = data;

  requireField(displayName, 'Display name');
  requireField(username, 'Username');

  const safeFollowerCount = validateIntField(followerCount, 'Follower count', 0) ?? 0;
  const safeFollowingCount = validateIntField(followingCount, 'Following count', 0) ?? 0;
  const safeAvgViews = validateIntField(avgViews, 'Average views', 0) ?? 0;
  const safeAvgLikes = validateIntField(avgLikes, 'Average likes', 0) ?? 0;
  const safeAvgComments = validateIntField(avgComments, 'Average comments', 0) ?? 0;
  const safeEngagementRate = validateFloatField(engagementRate, 'Engagement rate', 0, 1) ?? 0;
  const safePrice = validatePriceField(pricePerPost, 'Price per post', 0);

  const cleanName = displayName.trim();
  const cleanUser = cleanUsername(username);

  await ensureUniqueUsername(cleanUser);
  const slug = await generateUniqueSlug(cleanName, cleanUser);

  const socialRecords = Array.isArray(socialAccounts)
    ? socialAccounts
        .filter((s) => s && s.platform && cleanHandle(s.handle))
        .map((s) => buildSocialAccountRecord(null, s))
    : [];

  const influencer = await prisma.$transaction(async (tx) => {
    const created = await tx.influencer.create({
      data: {
        userId: user.id,
        displayName: cleanName,
        username: cleanUser,
        slug,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
        email: email ?? null,
        phone: phone ?? null,
        country: country ?? null,
        city: city ?? null,
        language: language ?? null,
        gender: gender ?? null,
        ageGroup: ageGroup ?? null,
        followerCount: safeFollowerCount,
        followingCount: safeFollowingCount,
        engagementRate: safeEngagementRate,
        categories: Array.isArray(categories) ? categories : [],
        audienceFavorites: Array.isArray(audienceFavorites) ? audienceFavorites : [],
        avgViews: safeAvgViews,
        avgLikes: safeAvgLikes,
        avgComments: safeAvgComments,
        pricePerPost: safePrice,
        currency: currency || 'USD',
        availability: availability || 'AVAILABLE',
        pricingTiers: pricingTiers ?? null,
        portfolio: portfolio ?? null,
        profileCompleted: !!(bio && categories?.length),
      },
    });

    if (socialRecords.length > 0) {
      await tx.influencerSocialAccount.createMany({
        data: socialRecords.map((r) => ({ ...r, influencerId: created.id })),
      });
    }

    if (audienceMetrics && typeof audienceMetrics === 'object') {
      await tx.influencerAudienceMetrics.create({
        data: {
          influencerId: created.id,
          ageDistribution: audienceMetrics.ageDistribution ?? null,
          genderDistribution: audienceMetrics.genderDistribution ?? null,
          topCountries: audienceMetrics.topCountries ?? null,
          interests: Array.isArray(audienceMetrics.interests)
            ? audienceMetrics.interests
            : [],
          audienceQuality: audienceMetrics.audienceQuality ?? null,
          fakeFollowerPct: audienceMetrics.fakeFollowerPct ?? null,
        },
      });
    }

    return tx.influencer.findUnique({
      where: { id: created.id },
      include: { socialAccounts: true, audienceMetrics: true },
    });
  });

  return shapeInfluencer(influencer);
}

module.exports = { createInfluencer };