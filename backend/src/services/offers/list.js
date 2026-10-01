// services/offers/list.js
// ======================================================
// GET /api/offers — role-aware listing
//   SUPER_ADMIN        → all offers
//   BRAND_*            → offers for brands in own org
//   INFLUENCER         → own offers only
// ======================================================

const prisma = require('../../config/prisma');
const {
  httpError,
  shapeOffer,
  parsePagination,
} = require('./helpers');

async function listOffers(user, query = {}) {
  const where = {};

  if (query.brandId) where.brandId = query.brandId;
  if (query.influencerId) where.influencerId = query.influencerId;
  if (query.status) where.status = query.status;

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isBrandRole = user.roles?.some((r) =>
    ['BRAND_OWNER', 'BRAND_TEAM_MEMBER'].includes(r)
  );
  const isInfluencer = user.roles?.includes('INFLUENCER');

  if (!isAdmin) {
    if (isBrandRole && user.organizationId) {
      where.brand = { organizationId: user.organizationId };
    } else if (isInfluencer) {
      const inf = await prisma.influencer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!inf) return { offers: [], total: 0, limit: 0, offset: 0 };
      where.influencerId = inf.id;
    } else {
      throw httpError('Forbidden: no role assigned to list offers', 403, 'FORBIDDEN');
    }
  }

  const { limit, offset } = parsePagination(query);

  const [rows, total] = await Promise.all([
    prisma.customOffer.findMany({
      where,
      include: { brand: true, influencer: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.customOffer.count({ where }),
  ]);

  return {
    offers: rows.map((r) => shapeOffer(r, { brand: r.brand, influencer: r.influencer })),
    total,
    limit,
    offset,
  };
}

module.exports = { listOffers };