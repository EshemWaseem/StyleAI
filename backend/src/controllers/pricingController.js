// controllers/pricingController.js
const prisma = require('../config/prisma');
const { updateInfluencerPricing } = require('../services/pricing');

async function updatePricing(req, res, next) {
  try {
    const influencer = await updateInfluencerPricing(
      req.user,
      req.params.influencerId,
      req.body
    );
    res.json({ message: 'Pricing updated', influencer });
  } catch (err) {
    next(err);
  }
}

async function getPricing(req, res, next) {
  try {
    const inf = await prisma.influencer.findUnique({
      where: { id: req.params.influencerId },
      select: {
        id: true,
        username: true,
        slug: true,
        displayName: true,
        avatarUrl: true,
        currency: true,
        pricingTiers: true,
        minBudget: true,
        acceptsBundles: true,
      },
    });
    if (!inf) return res.status(404).json({ message: 'Influencer not found' });

    res.json({
      pricing: {
        influencerId: inf.id,
        username: inf.username,
        slug: inf.slug,
        displayName: inf.displayName,
        avatarUrl: inf.avatarUrl,
        currency: inf.currency,
        pricingTiers: inf.pricingTiers || {},
        minBudget: inf.minBudget != null ? Number(inf.minBudget) : null,
        acceptsBundles: inf.acceptsBundles ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { updatePricing, getPricing };