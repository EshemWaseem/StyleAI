// services/recommendations/signals/index.js
const product = require('./productSignals');
const campaign = require('./campaignSignals');
const offer = require('./offerSignals');
const tips = require('./tips');

module.exports = {
  product,
  campaign,
  offer,
  tips,
};