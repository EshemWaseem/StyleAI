// services/wallet/index.js
const helpers = require('./helpers');
const { getMyWallet, getWalletForOffer } = require('./get');
const { listMyTransactions } = require('./listTransactions');
const {
  holdEscrowForOffer, releaseEscrowForOffer, refundEscrowForOffer,
} = require('./offerFlow');
const {
  requestWithdrawal, reviewWithdrawal, listWithdrawals,
} = require('./withdraw');


const { getWalletStats, listAllWallets } = require('./adminStats');

module.exports = {
  // owner-facing
  getMyWallet,
  listMyTransactions,
  getWalletForOffer,
  // offer flow
  holdEscrowForOffer,
  releaseEscrowForOffer,
  refundEscrowForOffer,
  // withdrawals
  requestWithdrawal,
  reviewWithdrawal,
  listWithdrawals,
   getWalletStats,
  listAllWallets,
  // utilities
  ensureWallet: helpers.ensureWallet,
  recalculateBalance: helpers.recalculateBalance,
  postTransaction: helpers.postTransaction,
  shapeWallet: helpers.shapeWallet,
  shapeTransaction: helpers.shapeTransaction,
};