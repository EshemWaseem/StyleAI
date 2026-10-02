const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { shapeWallet } = require('./helpers');

/**
 * Resolve the caller's wallet owner identity.
 * Priority:
 *   1. INFLUENCER role → influencerId (via userId lookup)
 *   2. Has organizationId → organizationId (brand/agency wallet shared by team)
 *   3. Fallback → userId (pure shopper)
 */
async function resolveWalletOwner(user) {
  // 1. INFLUENCER — find their influencer profile
  if (user.roles?.includes('INFLUENCER')) {
    const inf = await prisma.influencer.findUnique({
      where: { userId: user.id },
      select: { id: true, currency: true },
    });
    if (inf) {
      return {
        type: 'influencer',
        id: inf.id,
        currency: inf.currency || 'PKR',
      };
    }
    // INFLUENCER role but no profile yet — fall through
  }

  // 2. Brand / Agency / Team member — wallet is per organization
  if (user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, currency: true },
    });
    if (org) {
      return {
        type: 'organization',
        id: org.id,
        currency: org.currency || 'PKR',
      };
    }
  }

  // 3. Pure user (shopper) — wallet per user
  return { type: 'user', id: user.id, currency: 'PKR' };
}

/**
 * Find or lazily create the caller's wallet.
 * Auto-creates on first access so the UI never shows
 * "no wallet yet" for a legitimate user.
 */
async function getMyWallet(user) {
  if (!user?.id) throw httpError('Not authenticated', 401);

  const owner = await resolveWalletOwner(user);

  const where =
    owner.type === 'influencer'
      ? { influencerId: owner.id }
      : owner.type === 'organization'
      ? { organizationId: owner.id }
      : { userId: owner.id };

  let wallet = await prisma.wallet.findUnique({ where });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        ...where,
        currency: owner.currency || 'PKR',
        balanceCache: 0,
      },
    });
  }

  return shapeWallet(wallet);
}

/**
 * Get the offer context (used by wallet detail views).
 * Permission: admin, brand side, or the specific influencer.
 */
async function getWalletForOffer(user, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404);

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isBrandSide =
    user.organizationId && offer.brand.organizationId === user.organizationId;
  const isInfluencerSide = offer.influencer.userId === user.id;

  if (!isAdmin && !isBrandSide && !isInfluencerSide) {
    throw httpError('Forbidden', 403);
  }

  return { offer };
}

module.exports = { getMyWallet, getWalletForOffer, resolveWalletOwner };