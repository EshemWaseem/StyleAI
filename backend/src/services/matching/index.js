// services/matching/index.js
const { recommendForProduct, recommendProductsForMe } = require('./recommend');
const scoring = require('./scoring');

module.exports = {
  recommendForProduct,
  recommendProductsForMe,
  scoreInfluencer: scoring.scoreInfluencer,
  DEFAULT_WEIGHTS: scoring.DEFAULT_WEIGHTS,
};