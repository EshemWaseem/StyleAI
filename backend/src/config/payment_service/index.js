// config/payment_service/index.js
// ======================================================
// Payment service config — single entry point
// ======================================================

const shared    = require('./shared');
const stripe    = require('./stripe');
const jazzcash  = require('./jazzcash');
const easypaisa = require('./easypaisa');
const cod       = require('./cod');

const enabledGateways = [
  stripe.enabled    && 'STRIPE',
  jazzcash.enabled  && 'JAZZCASH',
  easypaisa.enabled && 'EASYPAISA',
  cod.enabled       && 'COD',
].filter(Boolean);

const allowedByContext = {
  SUBSCRIPTION: ['STRIPE', 'JAZZCASH', 'EASYPAISA'].filter((g) => enabledGateways.includes(g)),
  ORDER:        ['STRIPE', 'COD'].filter((g) => enabledGateways.includes(g)),
  PAYOUT:       ['JAZZCASH', 'EASYPAISA'].filter((g) => enabledGateways.includes(g)),
  ESCROW:       ['WALLET'],
};

module.exports = {
  shared,
  stripe,
  jazzcash,
  easypaisa,
  cod,
  enabledGateways,
  allowedByContext,
  isEnabled: (g) => enabledGateways.includes(g),
  isAllowed: (context, gateway) => (allowedByContext[context] || []).includes(gateway),
};