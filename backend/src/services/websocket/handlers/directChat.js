// services/websocket/handlers/directChat.js
// ======================================================
// Direct chat events (receive-side).
// Sending stays REST — this only handles WS-specific events.
// ======================================================

const prisma = require('../../../config/prisma');
const { checkRate } = require('../rateLimit');
const { assertCanAccessConversation } = require('../../chat/helpers');

function registerDirectChatHandlers(io, socket) {
  const { userId } = socket.data;

  /**
   * Client asks: "Give me recent messages for this conversation."
   * Server validates access, then returns. (Backup for missed events.)
   */
  socket.on('chat:fetch', async ({ conversationId, limit = 200 }, ack) => {
    try {
      if (!checkRate(socket.id, 'chat:fetch', 60, 10_000)) {
        return ack?.({ ok: false, error: 'RATE_LIMIT' });
      }

      if (!conversationId) return ack?.({ ok: false, error: 'MISSING_CONV_ID' });

      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv) return ack?.({ ok: false, error: 'NOT_FOUND' });

      // Verify caller is a participant
      await assertCanAccessConversation(
        { id: userId, roles: socket.data.roles, organizationId: socket.data.organizationId },
        conv
      );

      const messages = await prisma.directMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit) || 200, 500),
      });

      ack?.({
        ok: true,
        messages: messages.reverse().map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderUserId: m.senderUserId,
          senderRole: m.senderRole,
          senderPartyType: m.senderPartyType,
          senderPartyId: m.senderPartyId,
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

module.exports = { registerDirectChatHandlers };