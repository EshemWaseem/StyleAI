// services/wallet/index.js
const { getMyWallet, getWalletForOffer, resolveWalletOwner } = require('./get');
const { listMyTransactions } = require('./listTransactions');
const { requestWithdrawal, reviewWithdrawal, listWithdrawals } = require('./withdraw');
const { getWalletStats, listAllWallets } = require('./adminStats');
const { getPlatformWallet, creditPlatformWallet } = require('./platform');
const {
  createTopUpCheckout,
  creditWalletFromTopUp,
  findWalletByOwner,
  MIN_TOPUP,
  MAX_TOPUP,
} = require('./topup');
const {
  holdEscrowForOffer,
  releaseEscrowForOffer,
  refundEscrowForOffer,
} = require('./offerFlow');
const { creditOrderRevenue } = require('./orderFlow');
const {
  ensureWallet,
  recalculateBalance,
  postTransaction,
  shapeWallet,
  shapeTransaction,
  getFinanceRules,
} = require('./helpers');

module.exports = {
  // User-facing
  getMyWallet,
  getWalletForOffer,
  listMyTransactions,
  requestWithdrawal,

  // Top-up
  createTopUpCheckout,
  creditWalletFromTopUp,
  findWalletByOwner,
  MIN_TOPUP,
  MAX_TOPUP,

  // Offer escrow
  holdEscrowForOffer,
  releaseEscrowForOffer,
  refundEscrowForOffer,

  // Order revenue
  creditOrderRevenue,

  // Admin-facing
  reviewWithdrawal,
  listWithdrawals,
  getWalletStats,
  listAllWallets,

  // Platform
  getPlatformWallet,
  creditPlatformWallet,

  // Internal utilities
  resolveWalletOwner,
  ensureWallet,
  recalculateBalance,
  postTransaction,
  shapeWallet,
  shapeTransaction,
  getFinanceRules,
};