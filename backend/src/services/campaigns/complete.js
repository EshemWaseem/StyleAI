// services/campaigns/complete.js
// ======================================================
// Brand marks campaign complete
// Requires all deliverables APPROVED
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { assertIsBrandSide, shapeCampaign } = require('./helpers');
const { notifyUser, notifyAdmins } = require('../notifications');

async function completeCampaign(user, id) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { brand: true, influencer: true, deliverables: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  assertIsBrandSide(user, campaign);

  if (campaign.status === 'COMPLETED') {
    throw httpError('Already completed', 400, 'ALREADY_COMPLETED');
  }
  if (campaign.status === 'CANCELLED') {
    throw httpError('Cannot complete a cancelled campaign', 400, 'CANCELLED');
  }

  const notApproved = campaign.deliverables.filter((d) => d.status !== 'APPROVED');
  if (notApproved.length > 0) {
    throw httpError(
      `Cannot complete — ${notApproved.length} deliverable(s) not approved yet`,
      400, 'DELIVERABLES_PENDING'
    );
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: { brand: true, influencer: true, deliverables: true },
  });

  if (campaign.influencer.userId) {
    await notifyUser(campaign.influencer.userId, {
      type: 'SYSTEM',
      title: 'Campaign completed 🎉',
      body: `"${campaign.title}" is complete. Great work!`,
      link: `/campaigns/${id}`,
      meta: { campaignId: id },
    });
  }

  await notifyAdmins({
    type: 'SYSTEM',
    title: 'Campaign completed',
    body: `${campaign.brand.name} · ${campaign.influencer.displayName} — "${campaign.title}"`,
    link: `/admin/campaigns`,
    meta: { campaignId: id },
  });

  return shapeCampaign(updated);
}

module.exports = { completeCampaign };