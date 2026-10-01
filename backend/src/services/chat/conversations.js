// services/chat/conversations.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const {
  canonicalize, resolveMyParty, myPartyIn,
  assertCanAccessConversation, shapeConversation,
} = require('./helpers');

async function listMyConversations(user, query = {}) {
  const limit = Math.min(Number(query.limit) || 50, 100);
  const me = await resolveMyParty(user);
  if (!me) return { conversations: [], total: 0 };

  const where =
    me.type === 'INFLUENCER'
      ? {
          OR: [
            { partyAType: 'INFLUENCER', partyAId: me.id },
            { partyBType: 'INFLUENCER', partyBId: me.id },
          ],
        }
      : {
          OR: [
            { partyAType: 'ORG', partyAId: me.id },
            { partyBType: 'ORG', partyBId: me.id },
          ],
        };

  const rows = await prisma.conversation.findMany({
    where,
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  const shaped = await Promise.all(
    rows.map((r) => shapeConversation(r, { currentUserId: user.id }))
  );

  return { conversations: shaped, total: shaped.length };
}

// ------------------------------------------------------
// Open chat with ANY party:
//   POST /chat/conversations/with   { type, id }
//   type = "INFLUENCER" | "ORG"
// ------------------------------------------------------
async function getOrCreateConversation(user, targetType, targetId, contextType = 'DIRECT') {
  const me = await resolveMyParty(user);
  if (!me) throw httpError('You have no chat identity', 403, 'NO_IDENTITY');

  const target = await require('./helpers').enrichParty(targetType, targetId);
  if (!target) throw httpError('Target party not found', 404, 'NOT_FOUND');

  // Cannot chat with self
  if (me.type === targetType && me.id === targetId) {
    throw httpError('Cannot chat with yourself', 400, 'SELF_CHAT');
  }

  const [partyA, partyB] = canonicalize(
    me,
    { type: targetType, id: targetId }
  );

  let conv = await prisma.conversation.findUnique({
    where: {
      partyAType_partyAId_partyBType_partyBId: {
        partyAType: partyA.type,
        partyAId: partyA.id,
        partyBType: partyB.type,
        partyBId: partyB.id,
      },
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        partyAType: partyA.type,
        partyAId: partyA.id,
        partyBType: partyB.type,
        partyBId: partyB.id,
        contextType,
      },
    });
  }

  return shapeConversation(conv, { currentUserId: user.id });
}

async function getConversation(user, id) {
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');
  await assertCanAccessConversation(user, conv);
  return shapeConversation(conv, { currentUserId: user.id });
}

async function getTotalUnread(user) {
  const me = await resolveMyParty(user);
  if (!me) return { unread: 0 };

  const where =
    me.type === 'INFLUENCER'
      ? {
          OR: [
            { partyAType: 'INFLUENCER', partyAId: me.id },
            { partyBType: 'INFLUENCER', partyBId: me.id },
          ],
        }
      : {
          OR: [
            { partyAType: 'ORG', partyAId: me.id },
            { partyBType: 'ORG', partyBId: me.id },
          ],
        };

  const rows = await prisma.conversation.findMany({ where });

  let total = 0;
  for (const c of rows) {
    const isA = c.partyAType === me.type && c.partyAId === me.id;
    total += isA ? c.unreadForA : c.unreadForB;
  }
  return { unread: total };
}

module.exports = {
  listMyConversations,
  getOrCreateConversation,
  getConversation,
  getTotalUnread,
};