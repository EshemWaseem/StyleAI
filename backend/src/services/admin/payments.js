const prisma = require('../../config/prisma');
const { assertSuperAdmin, parsePagination } = require('./helpers');

async function listPayments(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { limit, offset } = parsePagination(filters);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.payment.count(),
  ]);

  const totalRevenue = payments
    .filter((p) => p.status === 'SUCCEEDED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    total,
    count: payments.length,
    totalRevenue,
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      externalId: p.externalId,
      description: p.description,
      organization: p.organization,
      createdAt: p.createdAt,
    })),
  };
}

module.exports = { listPayments };