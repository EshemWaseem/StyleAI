// services/websocket/handlers/campaignChat.js
// ======================================================
// Campaign chat events:
//   - campaign:fetch   → load messages
//   - campaign:join    → enter live room for a campaign
//   - campaign:leave   → exit live room
// ======================================================

const prisma = require('../../../config/prisma');
const { checkRate } = require('../rateLimit');
const { assertCanViewCampaign } = require('../../campaigns/helpers');

function registerCampaignChatHandlers(io, socket) {
  const { userId, roles, organizationId } = socket.data;

  // ------------------------------------------------------
  // FETCH — pull recent messages
  // ------------------------------------------------------
  socket.on('campaign:fetch', async ({ campaignId, limit = 200 }, ack) => {
    try {
      if (!checkRate(socket.id, 'campaign:fetch', 60, 10_000)) {
        return ack?.({ ok: false, error: 'RATE_LIMIT' });
      }
      if (!campaignId) return ack?.({ ok: false, error: 'MISSING_CAMPAIGN_ID' });

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { brand: true, influencer: true, agency: true },
      });
      if (!campaign) return ack?.({ ok: false, error: 'NOT_FOUND' });

      await assertCanViewCampaign(
        { id: userId, roles, organizationId },
        campaign
      );

      const messages = await prisma.campaignMessage.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit) || 200, 500),
      });

      ack?.({
        ok: true,
        messages: messages.reverse().map((m) => ({
          id: m.id,
          campaignId: m.campaignId,
          senderUserId: m.senderUserId,
          senderRole: m.senderRole,
          body: m.body,
          attachments: m.attachments,
          isMine: m.senderUserId === userId,
          createdAt: m.createdAt,
        })),
      });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // ------------------------------------------------------
  // JOIN — enter live room for this campaign
  // ------------------------------------------------------
  socket.on('campaign:join', async ({ campaignId }, ack) => {
    try {
      if (!checkRate(socket.id, 'campaign:join', 30, 10_000)) {
        return ack?.({ ok: false, error: 'RATE_LIMIT' });
      }
      if (!campaignId) return ack?.({ ok: false, error: 'MISSING_CAMPAIGN_ID' });

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { brand: true, influencer: true, agency: true },
      });
      if (!campaign) return ack?.({ ok: false, error: 'NOT_FOUND' });

      await assertCanViewCampaign(
        { id: userId, roles, organizationId },
        campaign
      );

      const room = `campaign:${campaignId}`;
      socket.join(room);

      console.log(`[ws] user=${userId} joined ${room}`);
      ack?.({ ok: true, room });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // ------------------------------------------------------
  // LEAVE — exit live room
  // ------------------------------------------------------
  socket.on('campaign:leave', ({ campaignId } = {}) => {
    if (!campaignId) return;
    const room = `campaign:${campaignId}`;
    socket.leave(room);
    console.log(`[ws] user=${userId} left ${room}`);
  });
}

module.exports = { registerCampaignChatHandlers };