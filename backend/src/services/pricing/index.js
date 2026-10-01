// services/pricing/index.js
const { validatePricingTiers } = require('./validatePricing');
const { updateInfluencerPricing } = require('./updatePricing');

module.exports = {
  validatePricingTiers,
  updateInfluencerPricing,
};