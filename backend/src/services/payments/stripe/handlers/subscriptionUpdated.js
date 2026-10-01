// services/payments/stripe/handlers/subscriptionUpdated.js
const prisma = require('../../../../config/prisma');

async function handle(sub) {
  const organizationId = sub.metadata?.organizationId;
  if (!organizationId) return;

  await prisma.subscription.update({
    where: { organizationId },
    data: {
      stripeStatus: sub.status,
      stripeCurrentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      currentPeriodEnd:       sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

module.exports = { handle };