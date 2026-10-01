// services/offers/index.js
const { createOffer } = require('./create');
const { listOffers } = require('./list');
const { getOffer } = require('./get');
const { updateOffer } = require('./update');
const { submitOffer } = require('./submit');
const { adminReviewOffer } = require('./adminReview');
const { influencerReviewOffer } = require('./influencerReview');
const { estimateOfferTotals } = require('./estimate');
const helpers = require('./helpers');

module.exports = {
  createOffer,
  listOffers,
  getOffer,
  updateOffer,
  submitOffer,
  adminReviewOffer,
  influencerReviewOffer,
  estimateOfferTotals,
  // re-export helpers used by controllers
  getFinanceRules: helpers.getFinanceRules,
  computeOfferTotals: helpers.computeOfferTotals,
};