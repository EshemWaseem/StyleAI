const prisma = require('../../config/prisma');
const { assertSuperAdmin, httpError, writeAudit, parsePagination } = require('./helpers');

async function listInfluencers(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { limit, offset } = parsePagination(filters);
  const { search, status } = filters;

  const where = {};
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;

  const [influencers, total] = await Promise.all([
    prisma.influencer.findMany({
      where,
      include: {
        _count: { select: { socialAccounts: true, savedByOrgs: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.influencer.count({ where }),
  ]);

  return {
    total,
    count: influencers.length,
    influencers: influencers.map((i) => ({
      id: i.id,
      displayName: i.displayName,
      username: i.username,
      slug: i.slug,
      avatarUrl: i.avatarUrl,
      country: i.country,
      followerCount: i.followerCount,
      engagementRate: i.engagementRate,
      categories: i.categories,
      status: i.status,
      availability: i.availability,
      profileCompleted: i.profileCompleted,
      socialCount: i._count.socialAccounts,
      savedCount: i._count.savedByOrgs,
      createdAt: i.createdAt,
    })),
  };
}

async function updateInfluencerStatus(adminUser, influencerId, status, req) {
  assertSuperAdmin(adminUser);
  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    throw httpError('Invalid status', 400);
  }
  const inf = await prisma.influencer.findUnique({ where: { id: influencerId } });
  if (!inf) throw httpError('Influencer not found', 404);

  const updated = await prisma.influencer.update({
    where: { id: influencerId },
    data: { status },
  });

  await writeAudit({
    actorId: adminUser.id,
    action: `influencer.${status.toLowerCase()}`,
    targetType: 'influencer',
    targetId: influencerId,
    meta: { username: inf.username, previous: inf.status },
    ipAddress: req?.ip,
  });

  return { id: influencerId, status: updated.status };
}

async function deleteInfluencer(adminUser, influencerId, req) {
  assertSuperAdmin(adminUser);
  const inf = await prisma.influencer.findUnique({ where: { id: influencerId } });
  if (!inf) throw httpError('Influencer not found', 404);

  await prisma.influencer.delete({ where: { id: influencerId } });

  await writeAudit({
    actorId: adminUser.id,
    action: 'influencer.delete',
    targetType: 'influencer',
    targetId: influencerId,
    meta: { username: inf.username },
    ipAddress: req?.ip,
  });

  return { id: influencerId };
}

module.exports = { listInfluencers, updateInfluencerStatus, deleteInfluencer };