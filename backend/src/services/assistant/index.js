// services/assistant/index.js
// ======================================================
// Barrel — public surface of the assistant domain
// ======================================================

const { chat } = require('./chat');
const {
  listConversations,
  getConversation,
  deleteConversation,
} = require('./conversations');

module.exports = {
  chat,
  listConversations,
  getConversation,
  deleteConversation,
};