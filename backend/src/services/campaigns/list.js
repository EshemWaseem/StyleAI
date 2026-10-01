// services/campaigns/list.js
const prisma = require('../../config/prisma');
const { parsePagination } = require('../admin/helpers');
const { shapeCampaign } = require('./helpers');

async function listCampaigns(user, query = {}) {
  const { limit, offset } = parsePagination(query);
  const where = {};
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isInfluencer = user.roles?.includes('INFLUENCER');

  if (isAdmin && query.all) {
    // all campaigns
  } else if (isInfluencer) {
    const inf = await prisma.influencer.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!inf) return { campaigns: [], total: 0, limit, offset };
    where.influencerId = inf.id;
  } else if (user.organizationId) {
    where.brand = { organizationId: user.organizationId };
  } else {
    return { campaigns: [], total: 0, limit, offset };
  }

  if (query.status) where.status = query.status;

  const [rows, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        brand: true,
        influencer: true,
        deliverables: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.campaign.count({ where }),
  ]);

  return {
    campaigns: rows.map((c) => shapeCampaign(c)),
    total, limit, offset,
  };
}

module.exports = { listCampaigns };