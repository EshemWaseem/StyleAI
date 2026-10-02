// services/websocket/handlers/typing.js
// ======================================================
// Typing indicators — ephemeral, no DB writes.
// ======================================================

const { checkRate } = require('../rateLimit');
const { emitToUsers, resolveConversationUserIds, resolveCampaignUserIds } = require('../broadcast');
const prisma = require('../../../config/prisma');
const { assertCanAccessConversation } = require('../../chat/helpers');
const { assertCanViewCampaign } = require('../../campaigns/helpers');

function registerTypingHandlers(io, socket) {
  const { userId, roles, organizationId, name } = socket.data;

  // ---- Direct chat typing ----
  socket.on('typing:direct', async ({ conversationId, isTyping }) => {
    if (!checkRate(socket.id, 'typing', 60, 10_000)) return;
    if (!conversationId) return;

    try {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conv) return;

      await assertCanAccessConversation(
        { id: userId, roles, organizationId },
        conv
      );

      const allUserIds = await resolveConversationUserIds(conv);
      const recipients = allUserIds.filter((id) => id !== userId);

      emitToUsers(recipients, 'typing:direct', {
        conversationId,
        userId,
        userName: name || 'Someone',
        isTyping: !!isTyping,
      });
    } catch { /* ignore */ }
  });

  // ---- Campaign chat typing ----
  socket.on('typing:campaign', async ({ campaignId, isTyping }) => {
    if (!checkRate(socket.id, 'typing', 60, 10_000)) return;
    if (!campaignId) return;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { brand: true, influencer: true, agency: true },
      });
      if (!campaign) return;

      await assertCanViewCampaign(
        { id: userId, roles, organizationId },
        campaign
      );

      const allUserIds = await resolveCampaignUserIds(campaign);
      const recipients = allUserIds.filter((id) => id !== userId);

      emitToUsers(recipients, 'typing:campaign', {
        campaignId,
        userId,
        userName: name || 'Someone',
        isTyping: !!isTyping,
      });
    } catch { /* ignore */ }
  });
}

module.exports = { registerTypingHandlers };