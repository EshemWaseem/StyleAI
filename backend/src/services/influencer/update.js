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

const STRING_FIELDS = [
  'displayName', 'bio', 'avatarUrl', 'email', 'phone',
  'country', 'city', 'language', 'gender', 'ageGroup',
  'currency', 'availability',
];

function checkPermission(user, influencer) {
  const isSelf = influencer.userId === user.id;
  const isAdmin = user.roles.includes('SUPER_ADMIN');
  const hasPermission = user.permissions.includes('influencer.update');

  if (!hasPermission && !isAdmin) {
    throw httpError('Forbidden: missing influencer.update permission', 403);
  }
  if (!isSelf && !isAdmin && !hasPermission) {
    throw httpError('Forbidden: cannot edit this influencer', 403);
  }
}

function buildUpdateData(data) {
  const update = {};

  for (const key of STRING_FIELDS) {
    if (data[key] !== undefined) update[key] = data[key] ?? null;
  }

  if (data.followerCount !== undefined) {
    update.followerCount = validateIntField(data.followerCount, 'Follower count', 0) ?? 0;
  }
  if (data.followingCount !== undefined) {
    update.followingCount = validateIntField(data.followingCount, 'Following count', 0) ?? 0;
  }
  if (data.avgViews !== undefined) {
    update.avgViews = validateIntField(data.avgViews, 'Average views', 0) ?? 0;
  }
  if (data.avgLikes !== undefined) {
    update.avgLikes = validateIntField(data.avgLikes, 'Average likes', 0) ?? 0;
  }
  if (data.avgComments !== undefined) {
    update.avgComments = validateIntField(data.avgComments, 'Average comments', 0) ?? 0;
  }
  if (data.engagementRate !== undefined) {
    update.engagementRate = validateFloatField(data.engagementRate, 'Engagement rate', 0, 1) ?? 0;
  }
  if (data.pricePerPost !== undefined) {
    update.pricePerPost = validatePriceField(data.pricePerPost, 'Price per post', 0);
  }
  if (data.categories !== undefined) {
    update.categories = Array.isArray(data.categories) ? data.categories : [];
  }
  if (data.audienceFavorites !== undefined) {
    update.audienceFavorites = Array.isArray(data.audienceFavorites) ? data.audienceFavorites : [];
  }
  if (data.pricingTiers !== undefined) update.pricingTiers = data.pricingTiers;
  if (data.portfolio !== undefined) update.portfolio = data.portfolio;

  return update;
}

async function updateUsername(username, existing) {
  const clean = cleanUsername(username);
  if (!clean || clean === existing.username) return null;
  const conflict = await prisma.influencer.findUnique({ where: { username: clean } });
  if (conflict) throw httpError('Username already taken', 409);
  return clean;
}

async function replaceSocialAccounts(influencerId, accounts) {
  await prisma.influencerSocialAccount.deleteMany({ where: { influencerId } });
  if (!accounts.length) return;

  await prisma.influencerSocialAccount.createMany({
    data: accounts
      .filter((s) => s && s.platform && cleanHandle(s.handle))
      .map((s) => ({
        influencerId,
        platform: s.platform,
        platformCustom: s.platform === 'OTHER' ? (s.platformCustom || 'Other') : null,
        handle: cleanHandle(s.handle),
        profileUrl: s.profileUrl ?? null,
        followerCount: validateIntField(s.followerCount, 'Social follower count', 0) ?? 0,
        followingCount: validateIntField(s.followingCount, 'Social following count', 0) ?? 0,
        engagementRate: validateFloatField(s.engagementRate, 'Social engagement rate', 0, 1) ?? 0,
        isPrimary: !!s.isPrimary,
      })),
  });
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

  return shapeInfluencer(influencer);
}

module.exports = { updateInfluencer };


//update.js
// 23-09 2:03

// const prisma = require('../../config/prisma');
// const {
//   shapeInfluencer,
//   httpError,
//   cleanHandle,
//   cleanUsername,
//    validateIntField,      // ← NEW
//   validateFloatField,    // ← NEW
//   validatePriceField, 
// } = require('./helpers');

// const STRING_FIELDS = [
//   'displayName', 'bio', 'avatarUrl', 'email', 'phone',
//   'country', 'city', 'language', 'gender', 'ageGroup',
//   'currency', 'availability',
// ];

// const NUMBER_FIELDS = [
//   'followerCount', 'followingCount', 'engagementRate',
//   'avgViews', 'avgLikes', 'avgComments',
// ];

// function checkPermission(user, influencer) {
//   const isSelf = influencer.userId === user.id;
//   const isAdmin = user.roles.includes('SUPER_ADMIN');
//   const hasPermission = user.permissions.includes('influencer.update');

//   if (!hasPermission && !isAdmin) {
//     throw httpError('Forbidden: missing influencer.update permission', 403);
//   }
//   if (!isSelf && !isAdmin && !hasPermission) {
//     throw httpError('Forbidden: cannot edit this influencer', 403);
//   }
// }

// function buildUpdateData(data, existing) {
//   const update = {};

//   for (const key of STRING_FIELDS) {
//     if (data[key] !== undefined) update[key] = data[key] ?? null;
//   }

//     if (data.followerCount !== undefined) {
//     update.followerCount = validateIntField(data.followerCount, 'Follower count', 0) ?? 0;
//   }
//   if (data.followingCount !== undefined) {
//     update.followingCount = validateIntField(data.followingCount, 'Following count', 0) ?? 0;
//   }
//   if (data.avgViews !== undefined) {
//     update.avgViews = validateIntField(data.avgViews, 'Average views', 0) ?? 0;
//   }
//   if (data.avgLikes !== undefined) {
//     update.avgLikes = validateIntField(data.avgLikes, 'Average likes', 0) ?? 0;
//   }
//   if (data.avgComments !== undefined) {
//     update.avgComments = validateIntField(data.avgComments, 'Average comments', 0) ?? 0;
//   }
//   if (data.engagementRate !== undefined) {
//     update.engagementRate =
//       validateFloatField(data.engagementRate, 'Engagement rate', 0, 1) ?? 0;
//   }
//   if (data.pricePerPost !== undefined) {
//     update.pricePerPost = validatePriceField(data.pricePerPost, 'Price per post', 0);
//   }

//   if (data.pricePerPost !== undefined) {
//     update.pricePerPost =
//       data.pricePerPost == null ? null : Number(data.pricePerPost);
//   }

//   if (data.categories !== undefined) {
//     update.categories = Array.isArray(data.categories) ? data.categories : [];
//   }

//   if (data.pricingTiers !== undefined) update.pricingTiers = data.pricingTiers;
//   if (data.portfolio !== undefined) update.portfolio = data.portfolio;

//   return update;
// }

// async function updateUsername(username, existing) {
//   const clean = cleanUsername(username);
//   if (!clean || clean === existing.username) return null;

//   const conflict = await prisma.influencer.findUnique({
//     where: { username: clean },
//   });
//   if (conflict) throw httpError('Username already taken', 409);
//   return clean;
// }

// async function replaceSocialAccounts(influencerId, accounts) {
//   await prisma.influencerSocialAccount.deleteMany({
//     where: { influencerId },
//   });

//   if (!accounts.length) return;

//   await prisma.influencerSocialAccount.createMany({
//     data: accounts.map((s) => ({
//       influencerId,
//       platform: s.platform,
//       handle: cleanHandle(s.handle),
//       profileUrl: s.profileUrl ?? null,
//       followerCount: Number(s.followerCount) || 0,
//       followingCount: Number(s.followingCount) || 0,
//       engagementRate: Number(s.engagementRate) || 0,
//       isPrimary: !!s.isPrimary,
//     })),
//   });
// }

// async function upsertAudienceMetrics(influencerId, am) {
//   const data = {
//     ageDistribution: am.ageDistribution ?? null,
//     genderDistribution: am.genderDistribution ?? null,
//     topCountries: am.topCountries ?? null,
//     interests: Array.isArray(am.interests) ? am.interests : [],
//     audienceQuality: am.audienceQuality ?? null,
//     fakeFollowerPct: am.fakeFollowerPct ?? null,
//   };

//   await prisma.influencerAudienceMetrics.upsert({
//     where: { influencerId },
//     update: data,
//     create: { influencerId, ...data },
//   });
// }

// async function updateInfluencer(user, influencerId, data = {}) {
//   const existing = await prisma.influencer.findUnique({
//     where: { id: influencerId },
//   });
//   if (!existing) throw httpError('Influencer not found', 404);

//   checkPermission(user, existing);

//   const updateData = buildUpdateData(data, existing);

//   if (data.username !== undefined) {
//     const newUsername = await updateUsername(data.username, existing);
//     if (newUsername) updateData.username = newUsername;
//   }

//   if (Array.isArray(data.socialAccounts)) {
//     await replaceSocialAccounts(influencerId, data.socialAccounts);
//   }

//   if (data.audienceMetrics && typeof data.audienceMetrics === 'object') {
//     await upsertAudienceMetrics(influencerId, data.audienceMetrics);
//   }

//   const influencer = await prisma.influencer.update({
//     where: { id: influencerId },
//     data: updateData,
//     include: { socialAccounts: true, audienceMetrics: true },
//   });

//   return shapeInfluencer(influencer);
// }

// module.exports = { updateInfluencer };