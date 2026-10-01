// services/matching/filters.js
// ======================================================
// Hard filters — runs BEFORE scoring to keep the pool small
// ======================================================

const prisma = require('../../config/prisma');

async function loadCandidatePool({ excludeInfluencerIds = [] } = {}) {
  const influencers = await prisma.influencer.findMany({
    where: {
      status: 'ACTIVE',
      availability: { not: 'UNAVAILABLE' },
      id: excludeInfluencerIds.length > 0 ? { notIn: excludeInfluencerIds } : undefined,
    },
    include: {
      socialAccounts: true,
      audienceMetrics: true,
    },
  });
  return influencers;
}

module.exports = { loadCandidatePool };