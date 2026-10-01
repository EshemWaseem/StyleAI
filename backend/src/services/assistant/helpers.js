// services/assistant/helpers.js
// ======================================================
// Shared helpers for assistant domain
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

/**
 * Get or create conversation for a user.
 */
async function getOrCreateConversation(user, conversationId) {
  if (conversationId) {
    const conv = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
    });
    if (!conv) throw httpError('Conversation not found', 404, 'NOT_FOUND');
    if (conv.userId !== user.id) throw httpError('Forbidden', 403, 'FORBIDDEN');
    return conv;
  }
  return prisma.assistantConversation.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId || null,
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

/**
 * Shape an assistant message for API response.
 */
function shapeMessage(m) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  };
}

/**
 * Shape a conversation (list view).
 */
function shapeConversation(c, messageCount) {
  return {
    id: c.id,
    title: c.title,
    lastMessageAt: c.lastMessageAt,
    messageCount: messageCount ?? 0,
    createdAt: c.createdAt,
  };
}

module.exports = {
  getOrCreateConversation,
  shapeMessage,
  shapeConversation,
};