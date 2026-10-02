// services/wallet/adminStats.js
// ======================================================
// Admin analytics over wallets + transactions
// Platform currency: PKR (all revenue normalized to PKR)
// ======================================================

const prisma = require('../../config/prisma');

const PLATFORM_CURRENCY = 'PKR';

async function getWalletStats() {
  // Platform revenue = PLATFORM_FEE meta accumulation
  const offers = await prisma.customOffer.findMany({
    where: { escrowReleasedAt: { not: null }, status: { in: ['INFLUENCER_ACCEPTED'] } },
    select: { adminFee: true, total: true, currency: true },
  });

  const totalBrandFees = offers.reduce((s, o) => s + Number(o.adminFee), 0);
  const totalVolume = offers.reduce((s, o) => s + Number(o.total), 0);

  // Influencer-side fees from OFFER_RELEASE meta
  const releaseRows = await prisma.walletTransaction.findMany({
    where: { type: 'OFFER_RELEASE', status: 'COMPLETED' },
    select: { meta: true },
  });
  const totalInfFees = releaseRows.reduce((s, r) => s + Number(r.meta?.influencerFee || 0), 0);

  // Subscription income (from platform wallet SUBSCRIPTION_INCOME)
  const subIncome = await prisma.walletTransaction.aggregate({
    where: { type: 'SUBSCRIPTION_INCOME', status: 'COMPLETED' },
    _sum: { amount: true },
  });
  const totalSubscription = Number(subIncome._sum.amount || 0);

  // Escrow held
  const heldOffers = await prisma.customOffer.aggregate({
    where: { escrowHeldAt: { not: null }, escrowReleasedAt: null },
    _sum: { total: true },
    _count: true,
  });

  // Pending withdrawals
  const pendingWithdrawals = await prisma.walletTransaction.aggregate({
    where: { type: 'WITHDRAWAL', status: 'PENDING' },
    _sum: { amount: true },
    _count: true,
  });

  // Wallet counts
  const [userWallets, orgWallets, infWallets] = await Promise.all([
    prisma.wallet.count({ where: { userId: { not: null } } }),
    prisma.wallet.count({ where: { organizationId: { not: null } } }),
    prisma.wallet.count({ where: { influencerId: { not: null } } }),
  ]);

  // Total balance held
  const totalBalances = await prisma.wallet.aggregate({
    _sum: { balanceCache: true },
  });

  const platformTotal = totalBrandFees + totalInfFees + totalSubscription;

  return {
    platformRevenue: {
      brandFees: Math.round(totalBrandFees * 100) / 100,
      influencerFees: Math.round(totalInfFees * 100) / 100,
      subscriptionIncome: Math.round(totalSubscription * 100) / 100,
      total: Math.round(platformTotal * 100) / 100,
      currency: PLATFORM_CURRENCY, // ✅ PKR — not hardcoded USD
    },
    volume: Math.round(totalVolume * 100) / 100,
    escrow: {
      count: heldOffers._count,
      amount: Number(heldOffers._sum.total || 0),
    },
    withdrawals: {
      pendingCount: pendingWithdrawals._count,
      pendingAmount: Math.abs(Number(pendingWithdrawals._sum.amount || 0)),
    },
    wallets: {
      users: userWallets,
      organizations: orgWallets,
      influencers: infWallets,
      total: userWallets + orgWallets + infWallets,
      totalBalanceHeld: Number(totalBalances._sum.balanceCache || 0),
    },
  };
}

async function listAllWallets(query = {}) {
  const { parsePagination } = require('../admin/helpers');
  const { limit, offset } = parsePagination(query);

  const where = {};
  if (query.ownerType === 'user') where.userId = { not: null };
  if (query.ownerType === 'organization') where.organizationId = { not: null };
  if (query.ownerType === 'influencer') where.influencerId = { not: null };

  const [rows, total] = await Promise.all([
    prisma.wallet.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        influencer: { select: { id: true, displayName: true, username: true } },
      },
      orderBy: { balanceCache: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.wallet.count({ where }),
  ]);

  return {
    wallets: rows.map((w) => ({
      id: w.id,
      currency: w.currency,
      balance: Number(w.balanceCache),
      ownerType: w.userId ? 'user' : w.organizationId ? 'organization' : 'influencer',
      owner: w.user
        ? { id: w.user.id, name: w.user.name, email: w.user.email }
        : w.organization
        ? { id: w.organization.id, name: w.organization.name, email: w.organization.slug }
        : w.influencer
        ? { id: w.influencer.id, name: w.influencer.displayName, email: w.influencer.username }
        : { id: '', name: '—', email: '—' },
      updatedAt: w.updatedAt,
    })),
    total, limit, offset,
  };
}

module.exports = { getWalletStats, listAllWallets, PLATFORM_CURRENCY };