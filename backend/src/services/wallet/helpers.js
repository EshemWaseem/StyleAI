const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { getAllSettings } = require('../admin/helpers');

async function getFinanceRules() {
  const all = await getAllSettings();
  return all.finance || {};
}

/** Find or lazily create wallet for a specific owner */
async function ensureWallet(owner, currency) {
  const where =
    owner.type === 'user' ? { userId: owner.id } :
    owner.type === 'organization' ? { organizationId: owner.id } :
    owner.type === 'influencer' ? { influencerId: owner.id } :
    (() => { throw httpError('Invalid wallet owner type', 400); })();

  let wallet = await prisma.wallet.findUnique({ where });
  if (wallet) return wallet;

  wallet = await prisma.wallet.create({
    data: {
      ...where,
      currency,
      balanceCache: 0,
    },
  });
  return wallet;
}

/** Rebuild balanceCache from ledger sum — source of truth */
async function recalculateBalance(walletId) {
  const agg = await prisma.walletTransaction.aggregate({
    where: { walletId, status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const balance = agg._sum.amount ?? 0;
  await prisma.wallet.update({
    where: { id: walletId },
    data: { balanceCache: balance },
  });
  return balance;
}

/** Atomically append a ledger row + update cache */
async function postTransaction(tx, {
  walletId, type, amount, currency, offerId, paymentId,
  reference, note, meta, createdBy, status = 'COMPLETED',
}) {
  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw httpError('Wallet not found', 404);

  const newBalance = Number(wallet.balanceCache) + Number(amount);
  if (newBalance < 0) {
    throw httpError(
      `Insufficient balance. Available: ${Number(wallet.balanceCache).toFixed(2)} ${currency}`,
      400,
      'INSUFFICIENT_BALANCE'
    );
  }

  const txn = await tx.walletTransaction.create({
    data: {
      walletId, type, status,
      amount, currency,
      balanceAfter: newBalance,
      offerId, paymentId, reference, note, meta, createdBy,
    },
  });

  await tx.wallet.update({
    where: { id: walletId },
    data: { balanceCache: newBalance },
  });

  return txn;
}

function shapeWallet(w) {
  return {
    id: w.id,
    currency: w.currency,
    balance: Number(w.balanceCache),
    updatedAt: w.updatedAt,
  };
}

function shapeTransaction(t) {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    amount: Number(t.amount),
    balanceAfter: Number(t.balanceAfter),
    currency: t.currency,
    offerId: t.offerId,
    note: t.note,
    reference: t.reference,
    createdAt: t.createdAt,
  };
}

module.exports = {
  getFinanceRules,
  ensureWallet,
  recalculateBalance,
  postTransaction,
  shapeWallet,
  shapeTransaction,
};