// services/websocket/handlers/campaignChat.js

const prisma = require('../../../config/prisma');
const { checkRate } = require('../rateLimit');
const { assertCanViewCampaign } = require('../../campaigns/helpers');

function registerCampaignChatHandlers(io, socket) {
  const { userId, roles, organizationId } = socket.data;

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
}

module.exports = { registerCampaignChatHandlers };