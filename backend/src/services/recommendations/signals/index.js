// services/recommendations/signals/index.js
// ======================================================
// Signals barrel — all signal modules
// ======================================================

const product = require('./productSignals');
const campaign = require('./campaignSignals');
const offer = require('./offerSignals');
const performance = require('./performanceSignals');
const tips = require('./tips');

module.exports = {
  product,
  campaign,
  offer,
  performance,
  tips,
};