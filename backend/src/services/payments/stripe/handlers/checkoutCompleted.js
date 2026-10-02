// services/payments/stripe/handlers/checkoutCompleted.js
// ✅ NEW: payment receipt email to brand owner.
const prisma = require('../../../../config/prisma');
const { getPlanByFullName } = require('../../../billing/plans');
const { creditPlatformWallet } = require('../../../wallet/platform');
const { sendToUser } = require('../../../email');

// Platform currency = PKR. Stripe charges USD → convert at boundary.
const USD_PKR_RATE = Number(process.env.USD_PKR_RATE || 278);

function toPlatformCurrency(amountMajor, fromCurrency) {
  const from = String(fromCurrency || 'usd').toUpperCase();
  if (from === 'PKR') return { amount: amountMajor, currency: 'PKR' };
  if (from === 'USD') return { amount: amountMajor * USD_PKR_RATE, currency: 'PKR' };
  console.warn(`[stripe.checkoutCompleted] unknown currency ${from}, keeping as-is`);
  return { amount: amountMajor, currency: from };
}

async function handle(session) {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.warn('[stripe.checkoutCompleted] missing organizationId in metadata');
    return;
  }

  // =====================================================
  // SUBSCRIPTION
  // =====================================================
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

    let paymentInvoiceNumber = null;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { organizationId },
        data: {
          planName,
          status: 'ACTIVE',
          provider: 'STRIPE',
          billingCycle: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
          stripeSubscriptionId: session.subscription,
          stripeStatus: 'active',
          stripeCustomerId: session.customer,
          isTrial: false,
          trialEndsAt: null,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
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
              provider: 'STRIPE',
              cycle,
              planName,
              role,
              stripeSessionId: session.id,
              stripeAmount,
              stripeCurrency,
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
            metadata: {
              stripeAmount,
              stripeCurrency,
              exchangeRate: USD_PKR_RATE,
            },
          },
        });
        paymentId = created.id;
        paymentInvoiceNumber = created.invoiceNumber;
      }

      await creditPlatformWallet(tx, {
        amount: platform.amount,
        currency: platform.currency,
        paymentId,
        reference: `STRIPE_SUB_${session.id}`,
        note: `Subscription — ${plan.label} (${role})`,
        meta: {
          planName,
          role,
          cycle,
          organizationId,
          stripeSessionId: session.id,
          stripeAmount,
          stripeCurrency,
          exchangeRate: USD_PKR_RATE,
        },
      });
    });

    console.log(
      `[stripe.checkoutCompleted] upgraded ${organizationId} → ${role}:${planName} + credited PKR ${platform.amount.toFixed(2)} (from ${stripeCurrency} ${stripeAmount.toFixed(2)})`
    );

    // ✅ Receipt email to brand owner (non-blocking)
    const owner = await prisma.user.findFirst({
      where: {
        organizationId,
        userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
      },
      select: { id: true },
    }).catch(() => null);

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

  // =====================================================
  // ONE-OFF (order payment)
  // =====================================================
  if (session.mode === 'payment') {
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

module.exports = { handle };
















// 02-10
// // services/payments/stripe/handlers/checkoutCompleted.js
// const prisma = require('../../../../config/prisma');
// const { getPlanByFullName } = require('../../../billing/plans');
// const { creditPlatformWallet } = require('../../../wallet/platform');

// // Platform currency = PKR. Stripe charges USD → convert at boundary.
// const USD_PKR_RATE = Number(process.env.USD_PKR_RATE || 278);

// function toPlatformCurrency(amountMajor, fromCurrency) {
//   const from = String(fromCurrency || 'usd').toUpperCase();
//   if (from === 'PKR') return { amount: amountMajor, currency: 'PKR' };
//   if (from === 'USD') return { amount: amountMajor * USD_PKR_RATE, currency: 'PKR' };
//   // Unknown — keep as-is but flag
//   console.warn(`[stripe.checkoutCompleted] unknown currency ${from}, keeping as-is`);
//   return { amount: amountMajor, currency: from };
// }

// async function handle(session) {
//   const organizationId = session.metadata?.organizationId;
//   if (!organizationId) {
//     console.warn('[stripe.checkoutCompleted] missing organizationId in metadata');
//     return;
//   }

//   // =====================================================
//   // SUBSCRIPTION
//   // =====================================================
//   if (session.mode === 'subscription') {
//     const planName = session.metadata.planName;
//     const role = session.metadata.role || 'BRAND';
//     const cycle = session.metadata.cycle || 'MONTHLY';

//     const plan = getPlanByFullName(`${role}:${planName}`);
//     if (!plan) {
//       console.warn(`[stripe.checkoutCompleted] plan not found: ${role}:${planName}`);
//       return;
//     }

//     // Stripe amount is in USD
//     const stripeAmount = (session.amount_total || 0) / 100;
//     const stripeCurrency = (session.currency || 'usd').toUpperCase();

//     // Convert to platform currency (PKR)
//     const platform = toPlatformCurrency(stripeAmount, stripeCurrency);

//     await prisma.$transaction(async (tx) => {
//       // 1. Upgrade subscription
//       await tx.subscription.update({
//         where: { organizationId },
//         data: {
//           planName,
//           status: 'ACTIVE',
//           provider: 'STRIPE',
//           billingCycle: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
//           stripeSubscriptionId: session.subscription,
//           stripeStatus: 'active',
//           stripeCustomerId: session.customer,
//           isTrial: false,
//           trialEndsAt: null,
//           cancelAtPeriodEnd: false,
//           cancelledAt: null,
//         },
//       });

//       // 2. Payment record — store in PLATFORM currency (PKR)
//       let paymentId = null;
//       const pending = await tx.payment.findFirst({
//         where: { externalId: session.id, status: 'PENDING' },
//       });

//       if (pending) {
//         await tx.payment.update({
//           where: { id: pending.id },
//           data: {
//             status: 'SUCCEEDED',
//             amount: platform.amount,
//             currency: platform.currency,
//             paidAt: new Date(),
//             stripePaymentIntentId: session.payment_intent || null,
//             metadata: {
//               provider: 'STRIPE',
//               cycle,
//               planName,
//               role,
//               stripeSessionId: session.id,
//               stripeAmount,
//               stripeCurrency,
//               exchangeRate: USD_PKR_RATE,
//             },
//           },
//         });
//         paymentId = pending.id;
//       } else {
//         const created = await tx.payment.create({
//           data: {
//             organizationId,
//             invoiceNumber: `ST-${session.id}`,
//             amount: platform.amount,
//             currency: platform.currency,
//             status: 'SUCCEEDED',
//             description: `Stripe subscription — ${plan.label}`,
//             provider: 'STRIPE',
//             context: 'SUBSCRIPTION',
//             externalId: session.id,
//             stripePaymentIntentId: session.payment_intent || null,
//             paidAt: new Date(),
//             metadata: {
//               stripeAmount,
//               stripeCurrency,
//               exchangeRate: USD_PKR_RATE,
//             },
//           },
//         });
//         paymentId = created.id;
//       }

//       // 3. Credit platform wallet in PKR
//       await creditPlatformWallet(tx, {
//         amount: platform.amount,
//         currency: platform.currency,
//         paymentId,
//         reference: `STRIPE_SUB_${session.id}`,
//         note: `Subscription — ${plan.label} (${role})`,
//         meta: {
//           planName,
//           role,
//           cycle,
//           organizationId,
//           stripeSessionId: session.id,
//           stripeAmount,
//           stripeCurrency,
//           exchangeRate: USD_PKR_RATE,
//         },
//       });
//     });

//     console.log(
//       `[stripe.checkoutCompleted] upgraded ${organizationId} → ${role}:${planName} + credited PKR ${platform.amount.toFixed(2)} (from ${stripeCurrency} ${stripeAmount.toFixed(2)})`
//     );
//   }

//   // =====================================================
//   // ONE-OFF (order payment)
//   // =====================================================
//   if (session.mode === 'payment') {
//     const orderId = session.metadata?.orderId;
//     if (!orderId) return;

//     await prisma.order.update({
//       where: { id: orderId },
//       data: {
//         paymentProvider: 'STRIPE',
//         paymentStatus: 'SUCCEEDED',
//         paymentRef: session.payment_intent || session.id,
//       },
//     });
//   }
// }

// module.exports = { handle };