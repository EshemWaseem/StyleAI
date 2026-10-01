// services/analytics/index.js
// ======================================================
// Barrel — public surface of the analytics domain
// ======================================================

const { getPlatformAnalytics } = require('./platform');
const { getBrandAnalytics } = require('./brand');
const { getAgencyAnalytics } = require('./agency');
const { getInfluencerAnalytics } = require('./influencer');

module.exports = {
  getPlatformAnalytics,
  getBrandAnalytics,
  getAgencyAnalytics,
  getInfluencerAnalytics,
};