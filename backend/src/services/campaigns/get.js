// services/campaigns/get.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { assertCanViewCampaign, shapeCampaign } = require('./helpers');

async function getCampaign(user, id) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      offer: true,
      brand: true,
      influencer: true,
      product: { include: { images: true } },
      agency: true,
      deliverables: {
        include: {
          submissions: { orderBy: { createdAt: 'desc' } },
          publishes: { orderBy: { postedAt: 'desc' } },
          metrics: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
      messages: { orderBy: { createdAt: 'asc' }, take: 200 },
    },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  await assertCanViewCampaign(user, campaign);

  return shapeCampaign(campaign);
}

module.exports = { getCampaign };