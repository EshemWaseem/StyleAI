// services/influencer/create.js
// ======================================================
// Create an influencer profile.
// SECURITY: Only an INFLUENCER role user can create their own profile.
//           One profile per user, ever.
// ======================================================

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

async function createInfluencer(user, data = {}) {
  // ======================================================
  // 1. Auth sanity
  // ======================================================
  if (!user || !user.id) {
    throw httpError('Unauthorized', 401, 'NO_USER');
  }

  // ======================================================
  // 2. Role check — STRICT
  //    Only INFLUENCER role can create a profile.
  //    SUPER_ADMIN allowed for platform-level fixes only.
  // ======================================================
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

  // ======================================================
  // 3. Duplicate check — one profile per user
  // ======================================================
  const existingForUser = await prisma.influencer.findUnique({
    where: { userId: user.id },
    select: { id: true, username: true },
  });
  if (existingForUser) {
    throw httpError(
      'You already have an influencer profile',
      409,
      'PROFILE_EXISTS'
    );
  }

  // ======================================================
  // 4. Destructure payload
  // ======================================================
  const {
    displayName,
    username,
    bio,
    avatarUrl,
    email,
    phone,
    country,
    city,
    language,
    gender,
    ageGroup,
    followerCount,
    followingCount,
    engagementRate,
    categories,
    audienceFavorites,
    avgViews,
    avgLikes,
    avgComments,
    pricePerPost,
    currency,
    availability,
    pricingTiers,
    portfolio,
    socialAccounts,
    audienceMetrics,
  } = data;

  // ======================================================
  // 5. Required fields
  // ======================================================
  requireField(displayName, 'Display name');
  requireField(username, 'Username');

  // ======================================================
  // 6. Numeric validation
  // ======================================================
  const safeFollowerCount = validateIntField(followerCount, 'Follower count', 0) ?? 0;
  const safeFollowingCount = validateIntField(followingCount, 'Following count', 0) ?? 0;
  const safeAvgViews = validateIntField(avgViews, 'Average views', 0) ?? 0;
  const safeAvgLikes = validateIntField(avgLikes, 'Average likes', 0) ?? 0;
  const safeAvgComments = validateIntField(avgComments, 'Average comments', 0) ?? 0;
  const safeEngagementRate = validateFloatField(engagementRate, 'Engagement rate', 0, 1) ?? 0;
  const safePrice = validatePriceField(pricePerPost, 'Price per post', 0);

  // ======================================================
  // 7. Username + slug uniqueness
  // ======================================================
  const cleanName = displayName.trim();
  const cleanUser = cleanUsername(username);

  await ensureUniqueUsername(cleanUser);
  const slug = await generateUniqueSlug(cleanName, cleanUser);

  // ======================================================
  // 8. Social accounts validation
  // ======================================================
  const safeSocialAccounts = Array.isArray(socialAccounts)
    ? socialAccounts
        .filter((s) => s && s.platform && cleanHandle(s.handle))
        .map((s) => ({
          platform: s.platform,
          platformCustom: s.platform === 'OTHER' ? (s.platformCustom || 'Other') : null,
          handle: cleanHandle(s.handle),
          profileUrl: s.profileUrl ?? null,
          followerCount: validateIntField(s.followerCount, 'Social follower count', 0) ?? 0,
          followingCount: validateIntField(s.followingCount, 'Social following count', 0) ?? 0,
          engagementRate: validateFloatField(s.engagementRate, 'Social engagement rate', 0, 1) ?? 0,
          isPrimary: !!s.isPrimary,
        }))
    : [];

  // ======================================================
  // 9. Create
  //    ⚠️ userId is FORCED to user.id — never trusted from payload.
  // ======================================================
  const influencer = await prisma.influencer.create({
    data: {
      userId: user.id, // ← forced, not from payload
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
      socialAccounts:
        safeSocialAccounts.length > 0 ? { create: safeSocialAccounts } : undefined,
      audienceMetrics:
        audienceMetrics && typeof audienceMetrics === 'object'
          ? {
              create: {
                ageDistribution: audienceMetrics.ageDistribution ?? null,
                genderDistribution: audienceMetrics.genderDistribution ?? null,
                topCountries: audienceMetrics.topCountries ?? null,
                interests: Array.isArray(audienceMetrics.interests) ? audienceMetrics.interests : [],
                audienceQuality: audienceMetrics.audienceQuality ?? null,
                fakeFollowerPct: audienceMetrics.fakeFollowerPct ?? null,
              },
            }
          : undefined,
    },
    include: { socialAccounts: true, audienceMetrics: true },
  });

  return shapeInfluencer(influencer);
}

module.exports = { createInfluencer };