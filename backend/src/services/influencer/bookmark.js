const prisma = require('../../config/prisma');
const { httpError } = require('./helpers');

async function saveInfluencer(user, influencerId) {
  if (!user.organizationId) {
    throw httpError('You must belong to an organization to save influencers', 403);
  }

  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });
  if (!influencer) throw httpError('Influencer not found', 404);

  await prisma.organizationInfluencer.upsert({
    where: {
      organizationId_influencerId: {
        organizationId: user.organizationId,
        influencerId,
      },
    },
    update: {},
    create: { organizationId: user.organizationId, influencerId },
  });

  return { saved: true, influencerId };
}

async function unsaveInfluencer(user, influencerId) {
  if (!user.organizationId) {
    throw httpError('You must belong to an organization', 403);
  }

  await prisma.organizationInfluencer.deleteMany({
    where: { organizationId: user.organizationId, influencerId },
  });

  return { saved: false, influencerId };
}

module.exports = { saveInfluencer, unsaveInfluencer };