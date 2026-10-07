// services/wallet/topup.js
// ======================================================
// Wallet top-up: brand/agency/influencer → own wallet.
// Delegates to the same payment gateway registry as subscriptions.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const registry = require('../payments/core/registry');
const config = require('../../config/payment_service');
const { resolveWalletOwner } = require('./get');

const MIN_TOPUP = 500;
const MAX_TOPUP = 2_000_000;

function getFrontendOrigin() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')[0]
    .trim();
}

async function createTopUpCheckout(user, payload = {}) {
  const { amount, provider } = payload;

  if (!amount || Number(amount) <= 0) {
    throw httpError('Amount must be greater than 0', 400, 'INVALID_AMOUNT');
  }
  const amt = Number(amount);
  if (amt < MIN_TOPUP) {
    throw httpError(`Minimum top-up is ${MIN_TOPUP}`, 400, 'BELOW_MIN');
  }
  if (amt > MAX_TOPUP) {
    throw httpError(`Maximum top-up is ${MAX_TOPUP}`, 400, 'ABOVE_MAX');
  }

  if (!provider) {
    throw httpError('Payment provider is required', 400, 'MISSING_PROVIDER');
  }
  const providerUpper = String(provider).toUpperCase();

  if (!config.isAllowed('WALLET_TOPUP', providerUpper)) {
    if (!config.isAllowed('SUBSCRIPTION', providerUpper)) {
      throw httpError(
        `Provider ${providerUpper} not allowed for wallet top-up`,
        400,
        'PROVIDER_NOT_ALLOWED'
      );
    }
  }

  // Resolve wallet owner
  const owner = await resolveWalletOwner(user);
  if (!owner?.id) {
    throw httpError('No wallet owner found', 400, 'NO_WALLET_OWNER');
  }

  // Load organization ONLY if wallet is org-owned
  let organization = null;
  if (owner.type === 'organization') {
    organization = await prisma.organization.findUnique({
      where: { id: owner.id },
    });
  }

  // ---- Defaults for success/cancel URLs ----
  const frontend = getFrontendOrigin();
  const successUrl =
    payload.successUrl || `${frontend}/wallet?topup=success`;
  const cancelUrl =
    payload.cancelUrl || `${frontend}/wallet?topup=cancelled`;

  // Resolve gateway
  const gateway = registry.get(providerUpper);

  // ✅ FIX: pass `metadata` (not `meta`) — Stripe gateway forwards
  //         this directly to session.metadata in Stripe.
  const session = await gateway.createCheckout({
    mode: 'payment',
    organization,               // may be null for influencer/user
    user,                       // ← pass user so gateway can build customer
    amount: amt,
    currency: 'PKR',
    description: `Wallet top-up — ${amt} PKR`,
    successUrl,
    cancelUrl,
    metadata: {
      context: 'WALLET_TOPUP',
      walletOwnerType: owner.type,
      walletOwnerId: owner.id,
      userId: user.id,
    },
  });

  // Persist PENDING payment record
  await prisma.payment.create({
    data: {
      organizationId: owner.type === 'organization' ? owner.id : null,
      invoiceNumber: `TOPUP-${session.reference}`,
      amount: amt,
      currency: 'PKR',
      status: 'PENDING',
      description: `Wallet top-up via ${providerUpper}`,
      provider: providerUpper,
      context: 'WALLET_TOPUP',
      externalId: session.reference,
      metadata: {
        provider: providerUpper,
        walletOwnerType: owner.type,
        walletOwnerId: owner.id,
        userId: user.id,
      },
    },
  });

  return session;
}

/**
 * Credit a wallet after successful payment (called from webhook).
 * Idempotent via `reference`.
 */
async function creditWalletFromTopUp(tx, {
  walletId,
  amount,
  currency,
  paymentId,
  reference,
  note,
  meta,
}) {
  const { postTransaction } = require('./helpers');

  const amt = Number(amount);
  if (!amt || amt <= 0) return null;

  const existing = await tx.walletTransaction.findFirst({
    where: { reference, type: 'DEPOSIT' },
  });
  if (existing) return existing;

  return postTransaction(tx, {
    walletId,
    type: 'DEPOSIT',
    amount: amt,
    currency: currency || 'PKR',
    paymentId: paymentId || null,
    reference,
    note: note || 'Wallet top-up',
    meta: meta || null,
    status: 'COMPLETED',
  });
}

async function findWalletByOwner({ type, id }) {
  const where =
    type === 'influencer'
      ? { influencerId: id }
      : type === 'organization'
      ? { organizationId: id }
      : { userId: id };

  let wallet = await prisma.wallet.findUnique({ where });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        ...where,
        currency: 'PKR',
        balanceCache: 0,
      },
    });
  }
  return wallet;
}

module.exports = {
  createTopUpCheckout,
  creditWalletFromTopUp,
  findWalletByOwner,
  MIN_TOPUP,
  MAX_TOPUP,
};