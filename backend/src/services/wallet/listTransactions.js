const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { shapeTransaction } = require('./helpers');
const { resolveWalletOwner } = require('./get');

/**
 * List the caller's wallet transactions.
 * Uses the same role-aware owner resolution as getMyWallet.
 */
async function listMyTransactions(user, query = {}) {
  if (!user?.id) throw httpError('Not authenticated', 401);

  const owner = await resolveWalletOwner(user);

  const where =
    owner.type === 'influencer'
      ? { influencerId: owner.id }
      : owner.type === 'organization'
      ? { organizationId: owner.id }
      : { userId: owner.id };

  const wallet = await prisma.wallet.findUnique({ where });
  if (!wallet) {
    // No wallet yet — return empty list (wallet will be created on getMe)
    return { transactions: [], total: 0, limit: 0, offset: 0 };
  }

  const limit = Math.min(Number(query.limit) || 100, 500);
  const offset = Number(query.offset) || 0;

  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);

  return {
    transactions: rows.map(shapeTransaction),
    total,
    limit,
    offset,
  };
}

module.exports = { listMyTransactions };