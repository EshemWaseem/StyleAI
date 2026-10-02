// services/recommendations/signals/index.js
// ======================================================
// Barrel export — all signal detectors
// ======================================================

const product = require('./productSignals');
const campaign = require('./campaignSignals');
const tips = require('./tips');

module.exports = {
  product,
  campaign,
  tips,
};