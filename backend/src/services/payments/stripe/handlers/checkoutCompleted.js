// services/payments/stripe/handlers/checkoutCompleted.js
const prisma = require('../../../../config/prisma');
const { getPlanByFullName } = require('../../../billing/plans');
const { creditPlatformWallet } = require('../../../wallet/platform');
const { creditWalletFromTopUp, findWalletByOwner } = require('../../../wallet/topup');
const { sendToUser } = require('../../../email');

const USD_PKR_RATE = Number(process.env.USD_PKR_RATE || 278);

function toPlatformCurrency(amountMajor, fromCurrency) {
  const from = String(fromCurrency || 'usd').toUpperCase();
  if (from === 'PKR') return { amount: amountMajor, currency: 'PKR' };
  if (from === 'USD') return { amount: amountMajor * USD_PKR_RATE, currency: 'PKR' };
  return { amount: amountMajor, currency: from };
}

async function handle(session) {
  const organizationId = session.metadata?.organizationId || null;
  const userId = session.metadata?.userId || null;

  //      =
  // WALLET TOP-UP
  //      =
  if (
    session.mode === 'payment' &&
    session.metadata?.context === 'WALLET_TOPUP'
  ) {
    await handleWalletTopUp(session);
    return;
  }

  // ✅ Need at least one identity
  if (!organizationId && !userId) {
    console.warn('[stripe.checkoutCompleted] missing organizationId and userId in metadata');
    return;
  }

  //      =
  // SUBSCRIPTION
  //      =
  if (session.mode === 'subscription') {
    const planName = session.metadata.planName;
    const role = session.metadata.role || 'BRAND';
    const cycle = session.metadata.cycle || 'MONTHLY';

    const plan = getPlanByFullName(`${role}:${planName}`);
    if (!plan) {
      console.warn(`[stripe.checkoutCompleted] plan not found: ${role}:${planName}`);
      return;
    }

    const stripeAmount = (session.amount_total || 0) / 100;
    const stripeCurrency = (session.currency || 'usd').toUpperCase();
    const platform = toPlatformCurrency(stripeAmount, stripeCurrency);

    let periodStart = new Date();
    let periodEnd = null;
    try {
      if (session.subscription) {
        const stripe = require('../client');
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
        if (stripeSub?.current_period_start) {
          periodStart = new Date(stripeSub.current_period_start * 1000);
        }
        if (stripeSub?.current_period_end) {
          periodEnd = new Date(stripeSub.current_period_end * 1000);
        }
      }
    } catch (e) {
      console.warn('[stripe.checkoutCompleted] could not fetch period dates:', e.message);
    }
    if (!periodEnd) {
      const days = cycle === 'YEARLY' ? 365 : 30;
      periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // ✅ Identity-aware subscription lookup
    const subWhere = organizationId ? { organizationId } : { userId };

    let paymentInvoiceNumber = null;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({ where: subWhere });

      const subData = {
        planName,
        role,
        status: 'ACTIVE',
        provider: 'STRIPE',
        billingCycle: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
        stripeSubscriptionId: session.subscription || null,
        stripeStatus: 'active',
        stripeCustomerId: session.customer || null,
        stripeCurrentPeriodEnd: periodEnd,
        // ✅ KEY: switch off trial
        isTrial: false,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      };

      if (existing) {
        await tx.subscription.update({
          where: { id: existing.id },
          data: subData,
        });
      } else {
        await tx.subscription.create({
          data: {
            organizationId,
            userId,
            ...subData,
          },
        });
      }

      let paymentId = null;
      const pending = await tx.payment.findFirst({
        where: { externalId: session.id, status: 'PENDING' },
      });

      if (pending) {
        await tx.payment.update({
          where: { id: pending.id },
          data: {
            status: 'SUCCEEDED',
            amount: platform.amount,
            currency: platform.currency,
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent || null,
            metadata: {
              provider: 'STRIPE', cycle, planName, role,
              stripeSessionId: session.id, stripeAmount, stripeCurrency,
              exchangeRate: USD_PKR_RATE,
            },
          },
        });
        paymentId = pending.id;
        paymentInvoiceNumber = pending.invoiceNumber;
      } else {
        const created = await tx.payment.create({
          data: {
            organizationId,
            invoiceNumber: `ST-${session.id}`,
            amount: platform.amount,
            currency: platform.currency,
            status: 'SUCCEEDED',
            description: `Stripe subscription — ${plan.label}`,
            provider: 'STRIPE',
            context: 'SUBSCRIPTION',
            externalId: session.id,
            stripePaymentIntentId: session.payment_intent || null,
            paidAt: new Date(),
            metadata: { stripeAmount, stripeCurrency, exchangeRate: USD_PKR_RATE },
          },
        });
        paymentId = created.id;
        paymentInvoiceNumber = created.invoiceNumber;
      }

      // ✅ Payment admin/platform wallet mein jayegi (existing logic)
      await creditPlatformWallet(tx, {
        amount: platform.amount,
        currency: platform.currency,
        paymentId,
        reference: `STRIPE_SUB_${session.id}`,
        note: `Subscription — ${plan.label} (${role})`,
        meta: {
          planName, role, cycle,
          organizationId: organizationId || null,
          userId: userId || null,
          stripeSessionId: session.id,
          stripeAmount,
          stripeCurrency,
          exchangeRate: USD_PKR_RATE,
        },
      });
    });

    console.log(
      `[stripe.checkoutCompleted] upgraded ${role} (org:${organizationId || '-'}, user:${userId || '-'}) → ${planName} | isTrial=false | PKR ${platform.amount.toFixed(2)} → admin`
    );

    // ✅ Clear trial gate cache so next request doesn't 402
    try {
      const { clearTrialCache } = require('../../../../middleware/trialGate');
      if (userId) clearTrialCache(userId);
    } catch (e) {
      // silent
    }

    // Send receipt email
    const owner = organizationId
      ? await prisma.user
          .findFirst({
            where: {
              organizationId,
              userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
            },
            select: { id: true },
          })
          .catch(() => null)
      : userId
      ? { id: userId }
      : null;

    if (owner?.id) {
      sendToUser(owner.id, 'paymentReceipt', {
        planLabel: plan.label,
        amount: platform.amount,
        currency: platform.currency,
        cycle,
        invoiceNumber: paymentInvoiceNumber,
        paidAt: new Date(),
        provider: 'Stripe',
      }).catch((e) => console.error('[email] paymentReceipt failed:', e.message));
    }
  }

  //      =
  // ONE-OFF (order payment)
  //      =
  if (session.mode === 'payment' && session.metadata?.context !== 'WALLET_TOPUP') {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: 'STRIPE',
        paymentStatus: 'SUCCEEDED',
        paymentRef: session.payment_intent || session.id,
      },
    });
  }
}

//      =
// WALLET TOP-UP (unchanged)
//      =
async function handleWalletTopUp(session) {
  const meta = session.metadata || {};
  const { walletOwnerType, walletOwnerId, userId } = meta;

  if (!walletOwnerType || !walletOwnerId) {
    console.warn('[stripe.checkoutCompleted] topup missing wallet owner');
    return;
  }

  const stripeAmount = (session.amount_total || 0) / 100;
  const stripeCurrency = (session.currency || 'usd').toUpperCase();
  const platform = toPlatformCurrency(stripeAmount, stripeCurrency);

  await prisma.$transaction(async (tx) => {
    const wallet = await findWalletByOwner({
      type: walletOwnerType,
      id: walletOwnerId,
    });

    let paymentId = null;
    const pending = await tx.payment.findFirst({
      where: { externalId: session.id, status: 'PENDING' },
    });

    if (pending) {
      await tx.payment.update({
        where: { id: pending.id },
        data: {
          status: 'SUCCEEDED',
          amount: platform.amount,
          currency: platform.currency,
          paidAt: new Date(),
          stripePaymentIntentId: session.payment_intent || null,
          metadata: {
            ...(pending.metadata || {}),
            stripeAmount,
            stripeCurrency,
            exchangeRate: USD_PKR_RATE,
          },
        },
      });
      paymentId = pending.id;
    } else {
      const created = await tx.payment.create({
        data: {
          organizationId: walletOwnerType === 'organization' ? walletOwnerId : null,
          invoiceNumber: `TOPUP-${session.id}`,
          amount: platform.amount,
          currency: platform.currency,
          status: 'SUCCEEDED',
          description: 'Wallet top-up via Stripe',
          provider: 'STRIPE',
          context: 'WALLET_TOPUP',
          externalId: session.id,
          stripePaymentIntentId: session.payment_intent || null,
          paidAt: new Date(),
          metadata: {
            walletOwnerType,
            walletOwnerId,
            userId,
            stripeAmount,
            stripeCurrency,
            exchangeRate: USD_PKR_RATE,
          },
        },
      });
      paymentId = created.id;
    }

    await creditWalletFromTopUp(tx, {
      walletId: wallet.id,
      amount: platform.amount,
      currency: platform.currency,
      paymentId,
      reference: `STRIPE_TOPUP_${session.id}`,
      note: 'Wallet top-up via Stripe',
      meta: { stripeAmount, stripeCurrency, exchangeRate: USD_PKR_RATE },
    });
  });

  console.log(
    `[stripe.checkoutCompleted] topup OK — ${walletOwnerType}:${walletOwnerId} + PKR ${platform.amount.toFixed(2)}`
  );

  if (userId) {
    sendToUser(userId, 'paymentReceipt', {
      planLabel: 'Wallet Top-up',
      amount: platform.amount,
      currency: platform.currency,
      cycle: 'ONE-OFF',
      invoiceNumber: `TOPUP-${session.id}`,
      paidAt: new Date(),
      provider: 'Stripe',
    }).catch((e) => console.error('[email] topup receipt failed:', e.message));
  }
}

module.exports = { handle };