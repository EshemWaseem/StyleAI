const prisma = require('../../config/prisma');
const matchingCache = require('../matching/cache');
const { httpError } = require('./helpers');

async function deleteInfluencer(user, influencerId) {
  const existing = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });
  if (!existing) throw httpError('Influencer not found', 404);

  await prisma.influencer.update({
    where: { id: influencerId },
    data: { status: 'ARCHIVED' },
  });

   matchingCache.invalidateInfluencer(influencerId);

  return { id: influencerId };
}

module.exports = { deleteInfluencer };