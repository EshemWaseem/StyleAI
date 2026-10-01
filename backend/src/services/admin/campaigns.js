const prisma = require('../../config/prisma');
const { assertSuperAdmin, parsePagination } = require('./helpers');

async function listCampaigns(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { limit, offset } = parsePagination(filters);

  // Campaign model may not exist — safe fallback
  try {
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.campaign.count(),
    ]);
    return { total, count: campaigns.length, campaigns };
  } catch {
    return { total: 0, count: 0, campaigns: [], note: 'Campaign model not yet in schema' };
  }
}

module.exports = { listCampaigns };