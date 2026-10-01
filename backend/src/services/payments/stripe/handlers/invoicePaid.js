// services/payments/stripe/handlers/invoicePaid.js
const prisma = require('../../../../config/prisma');

async function handle(invoice) {
  const organizationId = invoice.subscription_details?.metadata?.organizationId
    || invoice.metadata?.organizationId;
  if (!organizationId) return;

  await prisma.payment.upsert({
    where: { invoiceNumber: `ST-INV-${invoice.id}` },
    update: { status: 'SUCCEEDED', paidAt: new Date() },
    create: {
      organizationId,
      invoiceNumber: `ST-INV-${invoice.id}`,
      amount: (invoice.amount_paid || 0) / 100,
      currency: (invoice.currency || 'usd').toUpperCase(),
      status: 'SUCCEEDED',
      description: invoice.description || 'Stripe invoice',
      provider: 'STRIPE',
      context: 'SUBSCRIPTION',
      externalId: invoice.id,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent || null,
      paidAt: new Date(),
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd:   invoice.period_end   ? new Date(invoice.period_end * 1000)   : null,
    },
  });
}

module.exports = { handle };