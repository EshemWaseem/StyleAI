// backend/src/services/wallet/platform.js
// ======================================================
// Platform wallet — Super Admin's wallet. All platform-side
// income lands here (subscriptions, offer commissions).
// Currency: PKR
// ======================================================
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { postTransaction } = require('./helpers');

const PLATFORM_CURRENCY = 'PKR';

async function getPlatformWallet(tx = prisma) {
  const adminRole = await tx.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
    select: { id: true },
  });
  if (!adminRole) throw httpError('SUPER_ADMIN role not found', 500);

  const adminUserRole = await tx.userRole.findFirst({
    where: { roleId: adminRole.id },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          wallet: { select: { id: true, currency: true, balanceCache: true } },
        },
      },
    },
  });
  if (!adminUserRole?.user) throw httpError('No super admin user found', 500);

  const user = adminUserRole.user;
  if (user.wallet) return user.wallet;

  return tx.wallet.create({
    data: {
      userId: user.id,
      currency: PLATFORM_CURRENCY,
      balanceCache: 0,
    },
  });
}

/**
 * Credit the platform wallet.
 * Idempotent by `reference`.
 */
async function creditPlatformWallet(tx, {
  amount,
  currency,
  paymentId,
  reference,
  note,
  meta,
}) {
  const amt = Number(amount || 0);
  if (!amt || amt <= 0) return null;

  const existing = await tx.walletTransaction.findFirst({
    where: { reference, type: 'SUBSCRIPTION_INCOME' },
  });
  if (existing) return existing;

  const wallet = await getPlatformWallet(tx);

  return postTransaction(tx, {
    walletId: wallet.id,
    type: 'SUBSCRIPTION_INCOME',
    amount: amt,
    currency: currency || wallet.currency || PLATFORM_CURRENCY,
    paymentId: paymentId || null,
    reference,
    note: note || 'Subscription payment',
    meta: meta || null,
    status: 'COMPLETED',
  });
}

module.exports = { getPlatformWallet, creditPlatformWallet, PLATFORM_CURRENCY };