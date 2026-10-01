const prisma = require('../../config/prisma');
const { parsePagination } = require('../admin/helpers');
const { shapeTransaction } = require('./helpers');

async function listMyTransactions(user, query = {}) {
  const wallet = await prisma.wallet.findFirst({
    where:
      user.roles?.includes('INFLUENCER')
        ? { influencer: { userId: user.id } }
        : { userId: user.id },
  });
  if (!wallet) return { transactions: [], total: 0, limit: 0, offset: 0 };

  const { limit, offset } = parsePagination(query);

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
    total, limit, offset,
  };
}

module.exports = { listMyTransactions };