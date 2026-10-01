// services/campaigns/index.js
const helpers = require('./helpers');
const { createCampaignFromOffer } = require('./create');
const { listCampaigns } = require('./list');
const { getCampaign } = require('./get');
const { updateCampaign } = require('./update');
const { completeCampaign } = require('./complete');
const pipeline = require('./contentPipeline');
const chat = require('./chat');

module.exports = {
  createCampaignFromOffer,
  listCampaigns,
  getCampaign,
  updateCampaign,
  completeCampaign,
  // Content pipeline
  submitRawContent: pipeline.submitRawContent,
  startEditing: pipeline.startEditing,
  submitFinalContent: pipeline.submitFinalContent,
  approveContent: pipeline.approveContent,
  rejectContent: pipeline.rejectContent,
  publishContent: pipeline.publishContent,
  enterMetrics: pipeline.enterMetrics,
  recomputeCampaignAggregates: pipeline.recomputeCampaignAggregates,
  // Chat
  listChatMessages: chat.listMessages,
  sendChatMessage: chat.sendMessage,
  markChatRead: chat.markChatRead,
  getChatUnreadCount: chat.getUnreadCount,
  // Shaping
  shapeCampaign: helpers.shapeCampaign,
  shapeDeliverable: helpers.shapeDeliverable,
  shapeSubmission: helpers.shapeSubmission,
  shapePublish: helpers.shapePublish,
  shapeMetric: helpers.shapeMetric,
  shapeMessage: helpers.shapeMessage,
};