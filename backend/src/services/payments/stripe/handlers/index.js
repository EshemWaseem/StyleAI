// services/payments/stripe/handlers/index.js
module.exports = {
  checkoutCompleted:    require('./checkoutCompleted'),
  subscriptionUpdated:  require('./subscriptionUpdated'),
  subscriptionDeleted:  require('./subscriptionDeleted'),
  invoicePaid:          require('./invoicePaid'),
  invoiceFailed:        require('./invoiceFailed'),
};