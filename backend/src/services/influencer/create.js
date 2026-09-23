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
} = require('./helpers');

async function createInfluencer(user, data = {}) {
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
    userId,
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

  const influencer = await prisma.influencer.create({
    data: {
      userId: userId ?? null,
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








// 23-09 2:02
// create.js


// const prisma = require('../../config/prisma');
// const {
//   shapeInfluencer,
//   requireField,
//   cleanUsername,
//   cleanHandle,
//   ensureUniqueUsername,
//   generateUniqueSlug,
//   validateIntField,
//   validateFloatField,
//   validatePriceField,
// } = require('./helpers');

// async function createInfluencer(user, data = {}) {
//   const {
//     displayName,
//     username,
//     bio,
//     avatarUrl,
//     email,
//     phone,
//     country,
//     city,
//     language,
//     gender,
//     ageGroup,
//     followerCount,
//     followingCount,
//     engagementRate,
//     categories,
//     avgViews,
//     avgLikes,
//     avgComments,
//     pricePerPost,
//     currency,
//     availability,
//     pricingTiers,
//     portfolio,
//     socialAccounts,
//     audienceMetrics,
//     userId,
//   } = data;

//   requireField(displayName, 'Display name');
//   requireField(username, 'Username');

//   // ======================================================
//   // VALIDATE NUMERIC FIELDS — friendly error messages
//   // ======================================================
//   const safeFollowerCount =
//     validateIntField(followerCount, 'Follower count', 0) ?? 0;
//   const safeFollowingCount =
//     validateIntField(followingCount, 'Following count', 0) ?? 0;
//   const safeAvgViews =
//     validateIntField(avgViews, 'Average views', 0) ?? 0;
//   const safeAvgLikes =
//     validateIntField(avgLikes, 'Average likes', 0) ?? 0;
//   const safeAvgComments =
//     validateIntField(avgComments, 'Average comments', 0) ?? 0;
//   const safeEngagementRate =
//     validateFloatField(engagementRate, 'Engagement rate', 0, 1) ?? 0;
//   const safePrice = validatePriceField(pricePerPost, 'Price per post', 0);

//   const cleanName = displayName.trim();
//   const cleanUser = cleanUsername(username);

//   await ensureUniqueUsername(cleanUser);
//   const slug = await generateUniqueSlug(cleanName, cleanUser);

//   // ======================================================
//   // VALIDATE SOCIAL ACCOUNTS (nested counts can also overflow)
//   // ======================================================
//   const safeSocialAccounts = Array.isArray(socialAccounts)
//     ? socialAccounts
//         .filter((s) => s && cleanHandle(s.handle))
//         .map((s) => ({
//           platform: s.platform,
//           handle: cleanHandle(s.handle),
//           profileUrl: s.profileUrl ?? null,
//           followerCount:
//             validateIntField(s.followerCount, 'Social follower count', 0) ?? 0,
//           followingCount:
//             validateIntField(s.followingCount, 'Social following count', 0) ?? 0,
//           engagementRate:
//             validateFloatField(s.engagementRate, 'Social engagement rate', 0, 1) ??
//             0,
//           isPrimary: !!s.isPrimary,
//         }))
//     : [];

//   const influencer = await prisma.influencer.create({
//     data: {
//       userId: userId ?? null,
//       displayName: cleanName,
//       username: cleanUser,
//       slug,
//       bio: bio ?? null,
//       avatarUrl: avatarUrl ?? null,
//       email: email ?? null,
//       phone: phone ?? null,
//       country: country ?? null,
//       city: city ?? null,
//       language: language ?? null,
//       gender: gender ?? null,
//       ageGroup: ageGroup ?? null,

//       // ---- validated values (NOT raw Number(...)) ----
//       followerCount: safeFollowerCount,
//       followingCount: safeFollowingCount,
//       engagementRate: safeEngagementRate,
//       avgViews: safeAvgViews,
//       avgLikes: safeAvgLikes,
//       avgComments: safeAvgComments,
//       pricePerPost: safePrice,

//       categories: Array.isArray(categories) ? categories : [],
//       currency: currency || 'USD',
//       availability: availability || 'AVAILABLE',
//       pricingTiers: pricingTiers ?? null,
//       portfolio: portfolio ?? null,
//       profileCompleted: !!(bio && categories?.length),

//       socialAccounts:
//         safeSocialAccounts.length > 0
//           ? { create: safeSocialAccounts }
//           : undefined,

//       audienceMetrics:
//         audienceMetrics && typeof audienceMetrics === 'object'
//           ? {
//               create: {
//                 ageDistribution: audienceMetrics.ageDistribution ?? null,
//                 genderDistribution: audienceMetrics.genderDistribution ?? null,
//                 topCountries: audienceMetrics.topCountries ?? null,
//                 interests: Array.isArray(audienceMetrics.interests)
//                   ? audienceMetrics.interests
//                   : [],
//                 audienceQuality: audienceMetrics.audienceQuality ?? null,
//                 fakeFollowerPct: audienceMetrics.fakeFollowerPct ?? null,
//               },
//             }
//           : undefined,
//     },
//     include: { socialAccounts: true, audienceMetrics: true },
//   });

//   return shapeInfluencer(influencer);
// }

// module.exports = { createInfluencer };