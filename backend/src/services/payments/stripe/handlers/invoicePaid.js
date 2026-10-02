// services/payments/stripe/handlers/invoicePaid.js
// ✅ NEW: payment receipt email to brand owner on renewals.
const prisma = require('../../../../config/prisma');
const { creditPlatformWallet } = require('../../../wallet/platform');
const { sendToUser } = require('../../../email');

const USD_PKR_RATE = Number(process.env.USD_PKR_RATE || 278);

function toPlatformCurrency(amountMajor, fromCurrency) {
  const from = String(fromCurrency || 'usd').toUpperCase();
  if (from === 'PKR') return { amount: amountMajor, currency: 'PKR' };
  if (from === 'USD') return { amount: amountMajor * USD_PKR_RATE, currency: 'PKR' };
  return { amount: amountMajor, currency: from };
}

async function handle(invoice) {
  const organizationId =
    invoice.subscription_details?.metadata?.organizationId ||
    invoice.metadata?.organizationId;

  if (!organizationId) {
    console.warn('[stripe.invoicePaid] no organizationId in invoice');
    return;
  }

  const stripeAmount = (invoice.amount_paid || 0) / 100;
  const stripeCurrency = (invoice.currency || 'usd').toUpperCase();
  const platform = toPlatformCurrency(stripeAmount, stripeCurrency);

  let paymentInvoiceNumber = `ST-INV-${invoice.id}`;
  let paymentId = null;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { invoiceNumber: `ST-INV-${invoice.id}` },
      update: {
        status: 'SUCCEEDED',
        amount: platform.amount,
        currency: platform.currency,
        paidAt: new Date(),
      },
      create: {
        organizationId,
        invoiceNumber: `ST-INV-${invoice.id}`,
        amount: platform.amount,
        currency: platform.currency,
        status: 'SUCCEEDED',
        description: invoice.description || 'Stripe invoice',
        provider: 'STRIPE',
        context: 'SUBSCRIPTION',
        externalId: invoice.id,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent || null,
        paidAt: new Date(),
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        metadata: {
          stripeAmount,
          stripeCurrency,
          exchangeRate: USD_PKR_RATE,
        },
      },
    });
    paymentId = payment.id;
    paymentInvoiceNumber = payment.invoiceNumber;

    await creditPlatformWallet(tx, {
      amount: platform.amount,
      currency: platform.currency,
      paymentId: payment.id,
      reference: `STRIPE_INV_${invoice.id}`,
      note: invoice.description || 'Stripe subscription renewal',
      meta: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        organizationId,
        stripeAmount,
        stripeCurrency,
        exchangeRate: USD_PKR_RATE,
      },
    });
  });

  console.log(
    `[stripe.invoicePaid] credited PKR ${platform.amount.toFixed(2)} (from ${stripeCurrency} ${stripeAmount.toFixed(2)}) for org ${organizationId}`
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
      planLabel: invoice.lines?.data?.[0]?.description || 'StyleAI Subscription',
      amount: platform.amount,
      currency: platform.currency,
      cycle: 'MONTHLY',
      invoiceNumber: paymentInvoiceNumber,
      paidAt: new Date(),
      provider: 'Stripe',
    }).catch((e) => console.error('[email] paymentReceipt (renewal) failed:', e.message));
  }
}

module.exports = { handle };














// 02-10
// // services/payments/stripe/handlers/invoicePaid.js
// const prisma = require('../../../../config/prisma');
// const { creditPlatformWallet } = require('../../../wallet/platform');

// const USD_PKR_RATE = Number(process.env.USD_PKR_RATE || 278);

// function toPlatformCurrency(amountMajor, fromCurrency) {
//   const from = String(fromCurrency || 'usd').toUpperCase();
//   if (from === 'PKR') return { amount: amountMajor, currency: 'PKR' };
//   if (from === 'USD') return { amount: amountMajor * USD_PKR_RATE, currency: 'PKR' };
//   return { amount: amountMajor, currency: from };
// }

// async function handle(invoice) {
//   const organizationId =
//     invoice.subscription_details?.metadata?.organizationId ||
//     invoice.metadata?.organizationId;

//   if (!organizationId) {
//     console.warn('[stripe.invoicePaid] no organizationId in invoice');
//     return;
//   }

//   const stripeAmount = (invoice.amount_paid || 0) / 100;
//   const stripeCurrency = (invoice.currency || 'usd').toUpperCase();
//   const platform = toPlatformCurrency(stripeAmount, stripeCurrency);

//   await prisma.$transaction(async (tx) => {
//     const payment = await tx.payment.upsert({
//       where: { invoiceNumber: `ST-INV-${invoice.id}` },
//       update: {
//         status: 'SUCCEEDED',
//         amount: platform.amount,
//         currency: platform.currency,
//         paidAt: new Date(),
//       },
//       create: {
//         organizationId,
//         invoiceNumber: `ST-INV-${invoice.id}`,
//         amount: platform.amount,
//         currency: platform.currency,
//         status: 'SUCCEEDED',
//         description: invoice.description || 'Stripe invoice',
//         provider: 'STRIPE',
//         context: 'SUBSCRIPTION',
//         externalId: invoice.id,
//         stripeInvoiceId: invoice.id,
//         stripePaymentIntentId: invoice.payment_intent || null,
//         paidAt: new Date(),
//         periodStart: invoice.period_start
//           ? new Date(invoice.period_start * 1000)
//           : null,
//         periodEnd: invoice.period_end
//           ? new Date(invoice.period_end * 1000)
//           : null,
//         metadata: {
//           stripeAmount,
//           stripeCurrency,
//           exchangeRate: USD_PKR_RATE,
//         },
//       },
//     });

//     await creditPlatformWallet(tx, {
//       amount: platform.amount,
//       currency: platform.currency,
//       paymentId: payment.id,
//       reference: `STRIPE_INV_${invoice.id}`,
//       note: invoice.description || 'Stripe subscription renewal',
//       meta: {
//         invoiceId: invoice.id,
//         subscriptionId: invoice.subscription,
//         organizationId,
//         stripeAmount,
//         stripeCurrency,
//         exchangeRate: USD_PKR_RATE,
//       },
//     });
//   });

//   console.log(
//     `[stripe.invoicePaid] credited PKR ${platform.amount.toFixed(2)} (from ${stripeCurrency} ${stripeAmount.toFixed(2)}) for org ${organizationId}`
//   );
// }

// module.exports = { handle };