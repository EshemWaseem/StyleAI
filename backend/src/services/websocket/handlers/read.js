// services/websocket/handlers/read.js
// ======================================================
// Read receipts — mark message read via WS.
// ======================================================

const { checkRate } = require('../rateLimit');
const { emitToUsers, resolveConversationUserIds } = require('../broadcast');
const prisma = require('../../../config/prisma');
const { assertCanAccessConversation } = require('../../chat/helpers');

function registerReadHandlers(io, socket) {
  const { userId, roles, organizationId } = socket.data;

  socket.on('read:direct', async ({ conversationId }) => {
    if (!checkRate(socket.id, 'read', 30, 10_000)) return;
    if (!conversationId) return;

    try {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conv) return;

      const mine = await assertCanAccessConversation(
        { id: userId, roles, organizationId },
        conv
      );

      const isA = mine.side === 'A';
      const myParty = mine.party;

      await prisma.$transaction([
        prisma.directMessage.updateMany({
          where: {
            conversationId,
            [isA ? 'readByA' : 'readByB']: false,
            NOT: { senderPartyType: myParty.type, senderPartyId: myParty.id },
          },
          data: { [isA ? 'readByA' : 'readByB']: true },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: isA ? { unreadForA: 0 } : { unreadForB: 0 },
        }),
      ]);

      // Notify other side
      const allUserIds = await resolveConversationUserIds(conv);
      const recipients = allUserIds.filter((id) => id !== userId);

      emitToUsers(recipients, 'read:direct', {
        conversationId,
        readBy: userId,
        at: new Date().toISOString(),
      });
    } catch { /* ignore */ }
  });
}

module.exports = { registerReadHandlers };