// services/chat/index.js
const conv = require('./conversations');
const msgs = require('./messages');
const helpers = require('./helpers');

module.exports = {
  listMyConversations: conv.listMyConversations,
  getOrCreateConversation: conv.getOrCreateConversation,
  getConversation: conv.getConversation,
  getTotalUnread: conv.getTotalUnread,
  listMessages: msgs.listMessages,
  sendMessage: msgs.sendMessage,
  markRead: msgs.markRead,
};