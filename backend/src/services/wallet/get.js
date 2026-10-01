const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { shapeWallet } = require('./helpers');

async function getMyWallet(user) {
  const wallet = await prisma.wallet.findFirst({
    where:
      user.roles?.includes('INFLUENCER')
        ? { influencer: { userId: user.id } }
        : { userId: user.id },
  });
  if (!wallet) return null; // wallet created lazily on first transaction
  return shapeWallet(wallet);
}

async function getWalletForOffer(user, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404);

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isBrandSide = user.organizationId && offer.brand.organizationId === user.organizationId;
  const isInfluencerSide = offer.influencer.userId === user.id;
  if (!isAdmin && !isBrandSide && !isInfluencerSide) {
    throw httpError('Forbidden', 403);
  }

  return { offer };
}

module.exports = { getMyWallet, getWalletForOffer };