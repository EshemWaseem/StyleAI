// services/campaigns/update.js
// ======================================================
// Brand updates brief, hashtags, mentions, dueDate, status
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { assertIsBrandSide, shapeCampaign } = require('./helpers');
const { notifyUser } = require('../notifications');

const ALLOWED_STATUS_BY_BRAND = ['CANCELLED', 'IN_REVIEW', 'DISPUTED'];

async function updateCampaign(user, id, payload = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { brand: true, influencer: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  assertIsBrandSide(user, campaign);

  const data = {};

  if (payload.title !== undefined) {
    const t = String(payload.title).trim();
    if (t.length < 3) throw httpError('title too short', 400, 'INVALID_TITLE');
    data.title = t;
  }
  if (payload.description !== undefined) data.description = payload.description ?? null;
  if (payload.brief !== undefined) data.brief = payload.brief ?? null;
  if (payload.hashtags !== undefined) {
    data.hashtags = Array.isArray(payload.hashtags) ? payload.hashtags.filter(Boolean) : [];
  }
  if (payload.mentions !== undefined) {
    data.mentions = Array.isArray(payload.mentions) ? payload.mentions.filter(Boolean) : [];
  }
  if (payload.dueDate !== undefined) {
    data.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  }
  if (payload.status !== undefined) {
    if (!ALLOWED_STATUS_BY_BRAND.includes(payload.status)) {
      throw httpError(
        `Brand cannot set status "${payload.status}". Allowed: ${ALLOWED_STATUS_BY_BRAND.join(', ')}`,
        400, 'INVALID_STATUS'
      );
    }
    data.status = payload.status;
  }

  if (Object.keys(data).length === 0) {
    throw httpError('Nothing to update', 400, 'EMPTY_UPDATE');
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data,
    include: { brand: true, influencer: true, deliverables: true },
  });

  // Notify influencer of key changes
  if (campaign.influencer.userId && (data.brief || data.dueDate || data.status === 'CANCELLED')) {
    await notifyUser(campaign.influencer.userId, {
      type: 'SYSTEM',
      title: data.status === 'CANCELLED' ? 'Campaign cancelled' : 'Campaign updated',
      body: `"${updated.title}" has new details — check the brief.`,
      link: `/campaigns/${id}`,
      meta: { campaignId: id, changes: Object.keys(data) },
    });
  }

  return shapeCampaign(updated);
}

module.exports = { updateCampaign };