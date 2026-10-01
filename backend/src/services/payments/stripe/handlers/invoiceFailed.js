// services/payments/stripe/handlers/invoiceFailed.js
const prisma = require('../../../../config/prisma');

async function handle(invoice) {
  const organizationId = invoice.subscription_details?.metadata?.organizationId
    || invoice.metadata?.organizationId;
  if (!organizationId) return;

  await prisma.payment.upsert({
    where: { invoiceNumber: `ST-INV-${invoice.id}` },
    update: { status: 'FAILED' },
    create: {
      organizationId,
      invoiceNumber: `ST-INV-${invoice.id}`,
      amount: (invoice.amount_due || 0) / 100,
      currency: (invoice.currency || 'usd').toUpperCase(),
      status: 'FAILED',
      description: invoice.description || 'Stripe invoice (failed)',
      provider: 'STRIPE',
      context: 'SUBSCRIPTION',
      externalId: invoice.id,
      stripeInvoiceId: invoice.id,
    },
  });
}

module.exports = { handle };