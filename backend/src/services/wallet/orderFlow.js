// services/wallet/orderFlow.js
const { ensureWallet, postTransaction } = require('./helpers');
const { creditPlatformWallet } = require('./platform');

const DEFAULT_COMMISSION = 0.08;

/**
 * Credits brand + platform wallets for a delivered order.
 * Order schema has brandId → Brand.organizationId (no direct organizationId).
 * Must be called inside a Prisma $transaction.
 */
async function creditOrderRevenue(tx, { order, payment, actorUserId }) {
  // Derive org from brand relation (schema-correct)
  const organizationId = order.brand?.organizationId || order.organizationId;

  if (!organizationId) {
    throw new Error('Order is not linked to a seller organization');
  }
  if (!payment || payment.status !== 'SUCCEEDED') {
    throw new Error('Payment must be SUCCEEDED before crediting wallets');
  }

  const amount = Number(payment.amount);
  if (!amount || amount <= 0) {
    throw new Error('Invalid payment amount');
  }

  const currency = payment.currency || 'PKR';

  const subscription = await tx.subscription.findUnique({
    where: { organizationId },
    select: { planName: true, role: true },
  });

  const { getPlan } = require('../billing/plans');
  const plan = subscription
    ? getPlan(subscription.role, subscription.planName)
    : null;
  const commissionRate = Number(plan?.takeRate ?? DEFAULT_COMMISSION);

  const platformCommission = Math.round(amount * commissionRate * 100) / 100;
  const brandPayout = Math.round((amount - platformCommission) * 100) / 100;

  if (brandPayout < 0) {
    throw new Error('Computed brand payout is negative');
  }

  const brandWallet = await ensureWallet(
    { type: 'organization', id: organizationId },
    currency
  );

  await postTransaction(tx, {
    walletId: brandWallet.id,
    type: 'OFFER_RELEASE',
    amount: brandPayout,
    currency,
    paymentId: payment.id,
    reference: `ORDER-${order.id}`,
    note: `Order #${order.id.slice(0, 8)} delivered — ${(commissionRate * 100).toFixed(1)}% platform fee`,
    meta: {
      orderId: order.id,
      orderTotal: amount,
      platformCommission,
      brandPayout,
      commissionRate,
      planName: subscription?.planName || null,
    },
    createdBy: actorUserId,
  });

  await creditPlatformWallet(tx, {
    amount: platformCommission,
    currency,
    paymentId: payment.id,
    reference: `ORDER-${order.id}-FEE`,
    note: `Platform commission from order #${order.id.slice(0, 8)}`,
    meta: {
      orderId: order.id,
      commissionRate,
      brandPayout,
    },
  });

  return {
    brandPayout,
    platformCommission,
    commissionRate,
    currency,
  };
}

module.exports = { creditOrderRevenue };