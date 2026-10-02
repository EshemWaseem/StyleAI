// services/payments/stripe/handlers/index.js
// ======================================================
// Exports handlers by SHORT NAME (webhook.js calls
// handlers.checkoutCompleted.handle(...) etc.)
// ======================================================

const checkoutCompleted   = require('./checkoutCompleted');
const invoicePaid         = require('./invoicePaid');
const invoiceFailed       = require('./invoiceFailed');
const subscriptionUpdated = require('./subscriptionUpdated');
const subscriptionDeleted = require('./subscriptionDeleted');

module.exports = {
  checkoutCompleted,
  invoicePaid,
  invoiceFailed,
  subscriptionUpdated,
  subscriptionDeleted,
};