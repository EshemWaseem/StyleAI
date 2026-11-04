// services/billing/cron.js
const prisma = require('../../config/prisma');
const { notifyUser } = require('../notifications');

const DAY_MS = 24 * 60 * 60 * 1000;

async function sendTrial1DayReminders() {
  // Trial exactly 12 to 36 hours mein khatam hone wala hai
  const minDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const maxDate = new Date(Date.now() + 36 * 60 * 60 * 1000);

  const subs = await prisma.subscription.findMany({
    where: {
      isTrial: true,
      status: 'ACTIVE',
      trialEndsAt: { gte: minDate, lt: maxDate },
    },
  });

  let sentCount = 0;

  for (const sub of subs) {
    const users = await prisma.user.findMany({
      where: {
        organizationId: sub.organizationId,
        userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
      },
      select: { id: true, name: true },
    });

    for (const u of users) {
      // Check karein ke pichle 24 ghanton mein email na gayi ho (Duplicate prevention)
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: u.id,
          type: 'SYSTEM',
          title: 'Trial ends tomorrow',
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      });

      if (alreadySent) continue;

      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Trial ends tomorrow',
        body: 'Your StyleAI trial ends in 1 day. Upgrade to keep full access.',
        link: '/plans',
        emailTemplate: 'trialExpiring',
        emailData: {
          name: u.name,
          role: 'BRAND',
          daysLeft: 1,
          planName: 'Free Trial',
        },
      }).catch(() => {});

      sentCount++;
    }
  }
  
  console.log(`[cron.trial] Sent ${sentCount} (1-day) reminders`);
  return sentCount;
}

async function sendTrialExpiredNotifications() {
  const yesterday = new Date(Date.now() - DAY_MS);
  const today = new Date();

  const subs = await prisma.subscription.findMany({
    where: {
      isTrial: true,
      status: 'ACTIVE',
      trialEndsAt: { gte: yesterday, lt: today },
    },
  });

  let count = 0;
  for (const sub of subs) {
    const users = await prisma.user.findMany({
      where: {
        organizationId: sub.organizationId,
        userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
      },
      select: { id: true, name: true },
    });

    for (const u of users) {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: u.id,
          type: 'SYSTEM',
          title: 'Your trial has ended',
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      });

      if (alreadySent) continue;

      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Your trial has ended',
        body: 'Choose a plan to continue using StyleAI.',
        link: '/plans',
        emailTemplate: 'trialExpired',
        emailData: {
          name: u.name,
          role: 'BRAND',
        },
      }).catch(() => {});
      
      count++;
    }
  }
  console.log(`[cron.trial] Sent ${count} trial-expired notifications`);
  return count;
}

async function cleanupStaleTrials() {
  const cutoff = new Date(Date.now() - 30 * DAY_MS);
  const result = await prisma.subscription.updateMany({
    where: {
      isTrial: true,
      status: 'ACTIVE',
      trialEndsAt: { lt: cutoff },
    },
    data: { status: 'EXPIRED' },
  });
  if (result.count > 0) {
    console.log(`[cron.trial] Soft-marked ${result.count} stale trials as EXPIRED`);
  }
}

async function runTrialSweep() {
  const start = Date.now();
  try {
    await sendTrial1DayReminders();
    await sendTrialExpiredNotifications();
    await cleanupStaleTrials();
    console.log(`[cron.trial] Sweep completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('[cron.trial] Sweep failed:', err.message);
  }
}

let intervalHandle = null;

function startCron() {
  if (intervalHandle) return;
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  setTimeout(() => { runTrialSweep().catch(() => {}); }, 60_000);

  intervalHandle = setInterval(() => {
    runTrialSweep().catch(() => {});
  }, SIX_HOURS);

  console.log('[cron.trial] Scheduler started (every 6h)');
}

function stopCron() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startCron,
  stopCron,
  runTrialSweep,
  sendTrial1DayReminders,
  sendTrialExpiredNotifications,
  cleanupStaleTrials,
};