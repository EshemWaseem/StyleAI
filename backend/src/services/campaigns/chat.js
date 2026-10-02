// services/campaigns/chat.js
// ======================================================
// Campaign chat — send, list, mark read
// Participants: brand owner/member, agency, influencer
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { assertCanViewCampaign } = require('./helpers');

// ── WebSocket broadcast (soft dependency — never blocks send) ──
let broadcastCampaignMessage = null;
try {
  broadcastCampaignMessage = require('../websocket/broadcast').broadcastCampaignMessage;
} catch (e) {
  console.warn('[campaigns.chat] WebSocket broadcast unavailable:', e.message);
}

const MAX_BODY = 2000;

// ------------------------------------------------------
// Determine sender role for a user on a campaign
// ------------------------------------------------------
function resolveSenderRole(user, campaign) {
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAgency = user.roles?.includes('AGENCY') && campaign.agencyId === user.organizationId;
  const isInfluencer = campaign.influencer?.userId === user.id;
  const isBrand =
    user.organizationId && campaign.brand?.organizationId === user.organizationId;

  if (isAgency) return 'AGENCY';
  if (isInfluencer) return 'INFLUENCER';
  if (isBrand) return 'BRAND';
  if (isAdmin) return 'ADMIN';
  return null;
}

// ------------------------------------------------------
// Shaping
// ------------------------------------------------------
function shapeMessage(m, { currentUserId } = {}) {
  return {
    id: m.id,
    campaignId: m.campaignId,
    senderUserId: m.senderUserId,
    senderRole: m.senderRole,
    senderAgencyId: m.senderAgencyId,
    body: m.body,
    attachments: m.attachments,
    isMine: currentUserId ? m.senderUserId === currentUserId : false,
    createdAt: m.createdAt,
  };
}

// ------------------------------------------------------
// LIST — 200 most recent, oldest first
// ------------------------------------------------------
async function listMessages(user, campaignId, query = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  await assertCanViewCampaign(user, campaign);

  const limit = Math.min(Number(query.limit) || 200, 500);

  const rows = await prisma.campaignMessage.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    messages: rows.reverse().map((m) => shapeMessage(m, { currentUserId: user.id })),
    campaignId,
  };
}

// ------------------------------------------------------
// SEND
// ------------------------------------------------------
async function sendMessage(user, campaignId, payload = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  await assertCanViewCampaign(user, campaign);

  const role = resolveSenderRole(user, campaign);
  if (!role) throw httpError('Forbidden: cannot send messages on this campaign', 403, 'FORBIDDEN');

  const body = (payload.body || '').trim();
  if (!body) throw httpError('Message body cannot be empty', 400, 'EMPTY_BODY');
  if (body.length > MAX_BODY) {
    throw httpError(`Message too long (max ${MAX_BODY} chars)`, 400, 'TOO_LONG');
  }

  const attachments =
    Array.isArray(payload.attachments) && payload.attachments.length > 0
      ? payload.attachments
      : null;

  const created = await prisma.campaignMessage.create({
    data: {
      campaignId,
      senderUserId: user.id,
      senderRole: role,
      senderAgencyId: role === 'AGENCY' ? user.organizationId : null,
      body,
      attachments,
      readByBrand: role === 'BRAND',
      readByInfluencer: role === 'INFLUENCER',
      readByAgency: role === 'AGENCY',
    },
  });

  const shaped = shapeMessage(created, { currentUserId: user.id });

  // ── Push to all other participants over WebSocket (fire-and-forget) ──
  if (broadcastCampaignMessage) {
    broadcastCampaignMessage(campaign, shaped, user.id).catch((err) => {
      console.warn('[campaigns.chat] WS broadcast failed:', err.message);
    });
  }

  return shaped;
}

// ------------------------------------------------------
// MARK READ — flip the flag for the caller's role
// ------------------------------------------------------
async function markChatRead(user, campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  await assertCanViewCampaign(user, campaign);

  const role = resolveSenderRole(user, campaign);
  if (!role) throw httpError('Forbidden', 403, 'FORBIDDEN');

  const field =
    role === 'BRAND' ? 'readByBrand'
    : role === 'INFLUENCER' ? 'readByInfluencer'
    : role === 'AGENCY' ? 'readByAgency'
    : null;

  if (!field) return { updated: 0 };

  const result = await prisma.campaignMessage.updateMany({
    where: {
      campaignId,
      [field]: false,
      NOT: { senderRole: role },
    },
    data: { [field]: true },
  });

  return { updated: result.count };
}

// ------------------------------------------------------
// UNREAD COUNT — per caller's role
// ------------------------------------------------------
async function getUnreadCount(user, campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  await assertCanViewCampaign(user, campaign);

  const role = resolveSenderRole(user, campaign);
  const field =
    role === 'BRAND' ? 'readByBrand'
    : role === 'INFLUENCER' ? 'readByInfluencer'
    : role === 'AGENCY' ? 'readByAgency'
    : null;

  if (!field) return { unread: 0 };

  const count = await prisma.campaignMessage.count({
    where: {
      campaignId,
      [field]: false,
      NOT: { senderRole: role },
    },
  });

  return { unread: count };
}

module.exports = {
  listMessages,
  sendMessage,
  markChatRead,
  getUnreadCount,
  shapeMessage,
};