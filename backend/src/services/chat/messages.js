// services/chat/messages.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const {
  assertCanAccessConversation,
  resolveSenderRole,
  resolveMyParty,
  shapeDirectMessage,
} = require('./helpers');

const MAX_BODY = 2000;

async function listMessages(user, conversationId, query = {}) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');
  await assertCanAccessConversation(user, conv);

  const limit = Math.min(Number(query.limit) || 200, 500);
  const rows = await prisma.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    conversationId,
    messages: rows.reverse().map((m) =>
      shapeDirectMessage(m, { currentUserId: user.id })
    ),
  };
}

async function sendMessage(user, conversationId, payload = {}) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');

  const mine = await assertCanAccessConversation(user, conv);
  const role = resolveSenderRole(user);
  const myParty = mine.party;
  if (!myParty) throw httpError('Cannot resolve sender party', 500);

  const body = (payload.body || '').trim();
  if (!body) throw httpError('Message body cannot be empty', 400, 'EMPTY_BODY');
  if (body.length > MAX_BODY) throw httpError(`Max ${MAX_BODY} chars`, 400, 'TOO_LONG');

  const attachments =
    Array.isArray(payload.attachments) && payload.attachments.length > 0
      ? payload.attachments
      : null;

  const senderIsA = mine.side === 'A';

  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.directMessage.create({
      data: {
        conversationId,
        senderUserId: user.id,
        senderRole: role,
        senderPartyType: myParty.type,
        senderPartyId: myParty.id,
        body,
        attachments,
        readByA: senderIsA,
        readByB: !senderIsA,
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessageBody: body.slice(0, 200),
        lastSenderUserId: user.id,
        ...(senderIsA
          ? { unreadForB: { increment: 1 } }
          : { unreadForA: { increment: 1 } }),
      },
    });

    return message;
  });

  return shapeDirectMessage(result, { currentUserId: user.id });
}

async function markRead(user, conversationId) {
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');

  const mine = await assertCanAccessConversation(user, conv);
  const isA = mine.side === 'A';

  const myParty = mine.party;
  const oppositeSideFlag = isA ? 'readByA' : 'readByB';
  const oppositePartyType = isA ? conv.partyBType : conv.partyAType;
  const oppositePartyId = isA ? conv.partyBId : conv.partyAId;

  await prisma.$transaction([
    prisma.directMessage.updateMany({
      where: {
        conversationId,
        [oppositeSideFlag]: false,
        // only mark messages sent by the OTHER party
        NOT: {
          senderPartyType: myParty.type,
          senderPartyId: myParty.id,
        },
      },
      data: { [oppositeSideFlag]: true },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: isA ? { unreadForA: 0 } : { unreadForB: 0 },
    }),
  ]);

  return { ok: true };
}

module.exports = { listMessages, sendMessage, markRead };