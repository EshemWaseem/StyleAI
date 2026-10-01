// services/offers/get.js
// ======================================================
// GET /api/offers/:id — single offer with permission check
// ======================================================

const prisma = require('../../config/prisma');
const { httpError, shapeOffer } = require('./helpers');

async function getOffer(user, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isBrandSide =
    user.organizationId && offer.brand.organizationId === user.organizationId;
  const isInfluencerSide = offer.influencer.userId === user.id;

  if (!isAdmin && !isBrandSide && !isInfluencerSide) {
    throw httpError('Forbidden: cannot view this offer', 403, 'FORBIDDEN');
  }

  return shapeOffer(offer, { brand: offer.brand, influencer: offer.influencer });
}

module.exports = { getOffer };