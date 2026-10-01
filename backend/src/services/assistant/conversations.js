// services/assistant/conversations.js
// ======================================================
// List / get / delete assistant conversations
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { shapeMessage, shapeConversation } = require('./helpers');

async function listConversations(user) {
  const rows = await prisma.assistantConversation.findMany({
    where: { userId: user.id },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: 30,
    include: { _count: { select: { messages: true } } },
  });

  return rows.map((c) => shapeConversation(c, c._count.messages));
}

async function getConversation(user, conversationId) {
  const conv = await prisma.assistantConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: 'asc' }, take: 200 },
    },
  });

  if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');
  if (conv.userId !== user.id) throw httpError('Forbidden', 403, 'FORBIDDEN');

  return {
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    lastMessageAt: conv.lastMessageAt,
    messages: conv.messages.map(shapeMessage),
  };
}

async function deleteConversation(user, conversationId) {
  const conv = await prisma.assistantConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');
  if (conv.userId !== user.id) throw httpError('Forbidden', 403, 'FORBIDDEN');

  await prisma.assistantConversation.delete({ where: { id: conversationId } });
  return { id: conversationId };
}

module.exports = {
  listConversations,
  getConversation,
  deleteConversation,
};