// config/payment_service/index.js
// Payment service config — single entry point

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

// Only allow gateways that are actually enabled.
// ESCROW is a virtual wallet gateway, not a payment provider — not filtered.
const allowIfEnabled = (list) => list.filter((g) => enabledGateways.includes(g));

const allowedByContext = {
  SUBSCRIPTION: allowIfEnabled(['STRIPE', 'JAZZCASH', 'EASYPAISA']),
  ORDER:        allowIfEnabled(['STRIPE', 'COD']),
  WALLET_TOPUP: allowIfEnabled(['STRIPE']),
  PAYOUT:       allowIfEnabled(['JAZZCASH', 'EASYPAISA']),
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