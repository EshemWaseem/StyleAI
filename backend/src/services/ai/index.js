// services/ai/index.js
const { trackUsage, getUsageStats, getUsageTimeline, listRecentUsage } = require('./usage');
const { listModels, getModel, createModel, updateModel, deleteModel } = require('./models');
const { getPricing, estimateCost, estimateTokens } = require('./pricing');

module.exports = {
  // Usage tracking
  trackUsage,
  getUsageStats,
  getUsageTimeline,
  listRecentUsage,

  // Registry
  listModels,
  getModel,
  createModel,
  updateModel,
  deleteModel,

  // Pricing utilities
  getPricing,
  estimateCost,
  estimateTokens,
};