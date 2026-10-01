// services/billing/usage.js
// ======================================================
// Usage tracking — monthly counters per subscription
// ======================================================

const prisma = require('../../config/prisma');

/**
 * Get (or create) the usage counter for the current subscription period.
 * Auto-resets when period changes.
 */
async function getOrCreateCounter(subscriptionId, periodStart, periodEnd) {
  // Find existing for this period
  let counter = await prisma.usageCounter.findUnique({
    where: {
      subscriptionId_periodStart: {
        subscriptionId,
        periodStart: new Date(periodStart),
      },
    },
  });
  if (counter) return counter;

  // Create new
  counter = await prisma.usageCounter.create({
    data: {
      subscriptionId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    },
  });
  return counter;
}

/**
 * Increment a usage field. Non-throwing — usage tracking must never break the parent call.
 *
 * @param {string} subscriptionId
 * @param {string} field  - 'aiTextCalls' | 'aiImageCalls' | 'aiAssistMessages' | 'campaignsCreated' | 'knowledgeIngests'
 * @param {number} by     - default 1
 */
async function increment(subscription, field, by = 1) {
  if (!subscription) return null;
  try {
    const periodStart = subscription.currentPeriodStart || new Date();
    const periodEnd = subscription.currentPeriodEnd
      || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await getOrCreateCounter(subscription.id, periodStart, periodEnd);

    return await prisma.usageCounter.update({
      where: {
        subscriptionId_periodStart: {
          subscriptionId: subscription.id,
          periodStart: new Date(periodStart),
        },
      },
      data: { [field]: { increment: by } },
    });
  } catch (err) {
    console.error('[usage.increment] failed:', err.message);
    return null;
  }
}

/**
 * Read current usage for a subscription (returns zeros if none yet).
 */
async function read(subscription) {
  if (!subscription) {
    return {
      aiTextCalls: 0,
      aiImageCalls: 0,
      aiAssistMessages: 0,
      campaignsCreated: 0,
      knowledgeIngests: 0,
      storageBytes: 0,
    };
  }
  const periodStart = subscription.currentPeriodStart || new Date();

  const counter = await prisma.usageCounter.findUnique({
    where: {
      subscriptionId_periodStart: {
        subscriptionId: subscription.id,
        periodStart: new Date(periodStart),
      },
    },
  });

  if (!counter) {
    return {
      aiTextCalls: 0,
      aiImageCalls: 0,
      aiAssistMessages: 0,
      campaignsCreated: 0,
      knowledgeIngests: 0,
      storageBytes: 0,
    };
  }

  return {
    aiTextCalls: counter.aiTextCalls,
    aiImageCalls: counter.aiImageCalls,
    aiAssistMessages: counter.aiAssistMessages,
    campaignsCreated: counter.campaignsCreated,
    knowledgeIngests: counter.knowledgeIngests,
    storageBytes: Number(counter.storageBytes),
  };
}

module.exports = { getOrCreateCounter, increment, read };