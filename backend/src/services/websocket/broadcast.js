// services/websocket/broadcast.js
// ======================================================
// Emit helpers — used by REST services to push real-time events.
// Lazy-loads the Socket.IO server to avoid circular deps.
// ======================================================

const prisma = require('../../config/prisma');

// ---- Lazy accessor ----
function _io() {
  try {
    const { hasIO, getIO } = require('./index');
    if (!hasIO()) return null;
    return getIO();
  } catch {
    return null;
  }
}

function emitToUser(userId, event, data) {
  if (!userId) return;
  const io = _io();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

function emitToUsers(userIds, event, data) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const io = _io();
  if (!io) return;
  for (const userId of userIds) {
    if (userId) io.to(`user:${userId}`).emit(event, data);
  }
}

// ✅ NEW — emit to campaign-specific room
function emitToCampaignRoom(campaignId, event, data) {
  if (!campaignId) return;
  const io = _io();
  if (!io) return;
  io.to(`campaign:${campaignId}`).emit(event, data);
}

// ======================================================
// Resolvers
// ======================================================

async function resolveConversationUserIds(conv) {
  const userIds = new Set();

  for (const [type, id] of [
    [conv.partyAType, conv.partyAId],
    [conv.partyBType, conv.partyBId],
  ]) {
    if (type === 'INFLUENCER') {
      const inf = await prisma.influencer.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (inf?.userId) userIds.add(inf.userId);
    } else if (type === 'ORG') {
      const users = await prisma.user.findMany({
        where: { organizationId: id, isActive: true },
        select: { id: true },
      });
      users.forEach((u) => userIds.add(u.id));
    }
  }

  return Array.from(userIds);
}

async function resolveCampaignUserIds(campaign) {
  const userIds = new Set();

  if (campaign.brand?.organizationId) {
    const brandUsers = await prisma.user.findMany({
      where: { organizationId: campaign.brand.organizationId, isActive: true },
      select: { id: true },
    });
    brandUsers.forEach((u) => userIds.add(u.id));
  }

  if (campaign.influencer?.userId) {
    userIds.add(campaign.influencer.userId);
  }

  if (campaign.agencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: campaign.agencyId, isActive: true },
      select: { id: true },
    });
    agencyUsers.forEach((u) => userIds.add(u.id));
  }

  return Array.from(userIds);
}

async function resolveOfferUserIds(offer) {
  const userIds = new Set();

  if (offer.brand?.organizationId) {
    const brandUsers = await prisma.user.findMany({
      where: { organizationId: offer.brand.organizationId, isActive: true },
      select: { id: true },
    });
    brandUsers.forEach((u) => userIds.add(u.id));
  }

  if (offer.influencer?.userId) {
    userIds.add(offer.influencer.userId);
  }

  if (offer.createdByAgencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: offer.createdByAgencyId, isActive: true },
      select: { id: true },
    });
    agencyUsers.forEach((u) => userIds.add(u.id));
  }

  return Array.from(userIds);
}

async function resolveEngagementUserIds(engagement) {
  const userIds = new Set();

  if (engagement.agencyOrganizationId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: engagement.agencyOrganizationId, isActive: true },
      select: { id: true },
    });
    agencyUsers.forEach((u) => userIds.add(u.id));
  }

  if (engagement.hiredByUserId) {
    userIds.add(engagement.hiredByUserId);
  }

  return Array.from(userIds);
}

// ======================================================
// Chat broadcasts
// ======================================================

async function broadcastDirectMessage(conv, message, senderUserId) {
  const allUserIds = await resolveConversationUserIds(conv);
  const recipients = allUserIds.filter((id) => id !== senderUserId);
  emitToUsers(recipients, 'chat:new', {
    kind: 'direct',
    conversationId: conv.id,
    message,
  });
}

/**
 * ✅ Campaign message broadcast — dual path:
 *   1. To the campaign ROOM (for anyone with the chat tab open)
 *   2. To individual USER rooms (for badge updates on other pages)
 */
async function broadcastCampaignMessage(campaign, message, senderUserId) {
  const payload = {
    kind: 'campaign',
    campaignId: campaign.id,
    message,
  };

  // 1) Live chat viewers (room-scoped)
  emitToCampaignRoom(campaign.id, 'chat:new', payload);

  // 2) Badge holders (user-scoped, excludes sender)
  const allUserIds = await resolveCampaignUserIds(campaign);
  const recipients = allUserIds.filter((id) => id !== senderUserId);
  emitToUsers(recipients, 'chat:new', payload);
}

// ======================================================
// Offer broadcasts
// ======================================================

async function emitOfferCreated(offer) {
  if (!offer?.influencer?.userId) return;
  emitToUser(offer.influencer.userId, 'offer:created', {
    offerId: offer.id,
    status: offer.status,
    title: offer.title,
  });
}

async function emitOfferUpdated(offer, eventType = 'updated') {
  if (!offer) return;

  const userIds = await resolveOfferUserIds(offer);
  if (userIds.length === 0) return;

  const payload = {
    offerId: offer.id,
    status: offer.status,
    eventType,
    title: offer.title,
    brandName: offer.brand?.name,
    influencerName: offer.influencer?.displayName,
  };

  emitToUsers(userIds, 'offer:updated', payload);
}

// ======================================================
// Engagement broadcasts
// ======================================================

async function emitEngagementCreated(engagement) {
  if (!engagement?.agencyOrganizationId) return;
  const agencyUsers = await prisma.user.findMany({
    where: { organizationId: engagement.agencyOrganizationId, isActive: true },
    select: { id: true },
  });
  const ids = agencyUsers.map((u) => u.id);
  emitToUsers(ids, 'engagement:created', {
    engagementId: engagement.id,
    status: engagement.status,
    title: engagement.title,
    clientType: engagement.clientType,
  });
}

async function emitEngagementUpdated(engagement, eventType = 'updated') {
  if (!engagement) return;
  const userIds = await resolveEngagementUserIds(engagement);
  if (userIds.length === 0) return;

  emitToUsers(userIds, 'engagement:updated', {
    engagementId: engagement.id,
    status: engagement.status,
    eventType,
    title: engagement.title,
    clientType: engagement.clientType,
  });
}

module.exports = {
  emitToUser,
  emitToUsers,
  emitToCampaignRoom,

  resolveConversationUserIds,
  resolveCampaignUserIds,
  resolveOfferUserIds,
  resolveEngagementUserIds,

  broadcastDirectMessage,
  broadcastCampaignMessage,

  emitOfferCreated,
  emitOfferUpdated,

  emitEngagementCreated,
  emitEngagementUpdated,
};