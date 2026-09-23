const prisma = require('../../config/prisma');
const { shapeInfluencer, getSavedSet } = require('./helpers');

async function listInfluencers(user, filters = {}) {
  const {
    q,
    platform,
    country,
    categories,
    minFollowers,
    maxFollowers,
    minEngagement,
    availability,
    status = 'ACTIVE',
    saved,
    limit = 60,
    offset = 0,
  } = filters;

  const where = { status };

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { bio: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (country) where.country = country;
  if (availability) where.availability = availability;

  if (minFollowers || maxFollowers) {
    where.followerCount = {};
    if (minFollowers) where.followerCount.gte = Number(minFollowers);
    if (maxFollowers) where.followerCount.lte = Number(maxFollowers);
  }

  if (minEngagement) {
    where.engagementRate = { gte: Number(minEngagement) };
  }

  if (categories) {
    const catList = String(categories)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (catList.length) where.categories = { hasSome: catList };
  }

  if (platform) {
    where.socialAccounts = { some: { platform } };
  }

  if (saved === 'true' && user.organizationId) {
    where.savedByOrgs = { some: { organizationId: user.organizationId } };
  }

  const [influencers, total] = await Promise.all([
    prisma.influencer.findMany({
      where,
      include: { socialAccounts: true, audienceMetrics: true },
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Number(limit) || 60, 200),
      skip: Number(offset) || 0,
    }),
    prisma.influencer.count({ where }),
  ]);

  const savedSet = await getSavedSet(
    user.organizationId,
    influencers.map((i) => i.id)
  );

  return {
    count: influencers.length,
    total,
    influencers: influencers.map((i) => shapeInfluencer(i, savedSet)),
  };
}

module.exports = { listInfluencers };