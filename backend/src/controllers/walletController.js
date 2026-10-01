const service = require('../services/wallet');

async function getMe(req, res, next) {
  try {
    const wallet = await service.getMyWallet(req.user);
    res.json({ wallet });
  } catch (err) { next(err); }
}

async function listTransactions(req, res, next) {
  try {
    const result = await service.listMyTransactions(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
}

async function requestWithdrawal(req, res, next) {
  try {
    const txn = await service.requestWithdrawal(req.user, req.body);
    res.status(201).json({ message: 'Withdrawal requested', transaction: txn });
  } catch (err) { next(err); }
}

async function reviewWithdrawal(req, res, next) {
  try {
    const txn = await service.reviewWithdrawal(req.user, req.params.txnId, req.body);
    res.json({ message: 'Withdrawal reviewed', transaction: txn });
  } catch (err) { next(err); }
}

async function listWithdrawals(req, res, next) {
  try {
    const result = await service.listWithdrawals(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
}

async function getStats(req, res, next) {
  try {
    const stats = await service.getWalletStats();
    res.json({ stats });
  } catch (err) { next(err); }
}

async function listAll(req, res, next) {
  try {
    const result = await service.listAllWallets(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = {
  getMe,
  listTransactions,
  requestWithdrawal,
  reviewWithdrawal,
  listWithdrawals,
  getStats,
  listAll,
};