// services/payments/core/constants.js
const PaymentProvider = Object.freeze({
  STRIPE: 'STRIPE',
  JAZZCASH: 'JAZZCASH',
  EASYPAISA: 'EASYPAISA',
  COD: 'COD',
  WALLET: 'WALLET',
});

const PaymentContext = Object.freeze({
  SUBSCRIPTION: 'SUBSCRIPTION',
  ORDER: 'ORDER',
  PAYOUT: 'PAYOUT',
  ESCROW: 'ESCROW',
});

const BillingCycle = Object.freeze({
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
});

const PaymentStatus = Object.freeze({
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});

module.exports = { PaymentProvider, PaymentContext, BillingCycle, PaymentStatus };