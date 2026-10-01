// services/payments/stripe/handlers/subscriptionDeleted.js
const prisma = require('../../../../config/prisma');

async function handle(sub) {
  const organizationId = sub.metadata?.organizationId;
  if (!organizationId) return;

  await prisma.subscription.update({
    where: { organizationId },
    data: {
      planName: 'free',
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      stripeStatus: 'canceled',
      cancelAtPeriodEnd: false,
      cancelledAt: new Date(),
    },
  });
}

module.exports = { handle };