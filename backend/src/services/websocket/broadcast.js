// services/websocket/broadcast.js
// ======================================================
// Emit helpers — used by REST services to push events.
// Lazy-loads the Socket.IO server to avoid circular deps.
// ======================================================

const prisma = require('../../config/prisma');

// ---- Lazy accessor (avoids circular require with index.js) ----
function _io() {
  try {
    const { hasIO, getIO } = require('./index');
    if (!hasIO()) return null;
    return getIO();
  } catch {
    return null;
  }
}

/**
 * Emit event to a single user's room.
 */
function emitToUser(userId, event, data) {
  if (!userId) return;
  const io = _io();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit event to multiple users.
 */
function emitToUsers(userIds, event, data) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const io = _io();
  if (!io) return;
  for (const userId of userIds) {
    if (userId) io.to(`user:${userId}`).emit(event, data);
  }
}

// ------------------------------------------------------
// Resolvers
// ------------------------------------------------------

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

// ------------------------------------------------------
// High-level broadcast helpers
// ------------------------------------------------------

async function broadcastDirectMessage(conv, message, senderUserId) {
  const allUserIds = await resolveConversationUserIds(conv);
  const recipients = allUserIds.filter((id) => id !== senderUserId);
  emitToUsers(recipients, 'chat:new', {
    kind: 'direct',
    conversationId: conv.id,
    message,
  });
}

async function broadcastCampaignMessage(campaign, message, senderUserId) {
  const allUserIds = await resolveCampaignUserIds(campaign);
  const recipients = allUserIds.filter((id) => id !== senderUserId);
  emitToUsers(recipients, 'chat:new', {
    kind: 'campaign',
    campaignId: campaign.id,
    message,
  });
}

module.exports = {
  emitToUser,
  emitToUsers,
  resolveConversationUserIds,
  resolveCampaignUserIds,
  broadcastDirectMessage,
  broadcastCampaignMessage,
};