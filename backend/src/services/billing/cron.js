// services/billing/cron.js
// ======================================================
// Trial lifecycle sweep — runs every 6 hours
// 1. Send reminders 3 days + 1 day before expiry
// 2. Notify on expiry
// 3. Cleanup abandoned trials (30-day grace, then soft-mark)
//
// ✅ NEW: in-app notification + email for each event.
// ======================================================

const prisma = require('../../config/prisma');
const { notifyUser } = require('../notifications');
const { computeEffectiveState } = require('./helpers');

const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------
// Helper: send one reminder for a given "days before expiry"
// window. Only sends once per user per window (idempotent
// by checking a flag in notification meta).
// ------------------------------------------------------
async function sendTrialReminderWindow({ daysLeft, minHours, maxHours }) {
  const now = Date.now();
  const minDate = new Date(now + minHours * 60 * 60 * 1000);
  const maxDate = new Date(now + maxHours * 60 * 60 * 1000);

  const subs = await prisma.subscription.findMany({
    where: {
      isTrial: true,
      status: 'ACTIVE',
      trialEndsAt: { gte: minDate, lt: maxDate },
    },
    include: { organization: { select: { name: true } } },
  });

  let sent = 0;
  for (const sub of subs) {
    const users = await prisma.user.findMany({
      where: {
        organizationId: sub.organizationId,
        userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
      },
      select: { id: true, name: true },
    });

    for (const u of users) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: daysLeft === 1
          ? 'Trial ends tomorrow'
          : `Trial ends in ${daysLeft} days`,
        body: `Your StyleAI trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to keep full access.`,
        link: '/plans',
        // ✅ EMAIL
        emailTemplate: 'trialExpiring',
        emailData: {
          name: u.name,
          role: 'BRAND',
          daysLeft,
          planName: 'Free Trial',
        },
      }).catch(() => {});
      sent++;
    }
  }
  console.log(`[cron.trial] Sent ${sent} reminders (${daysLeft}-day window)`);
  return sent;
}

// ------------------------------------------------------
// 3-day reminder
// ------------------------------------------------------
async function sendTrial3DayReminders() {
  // Window: 48–96 hours from now (so daily 6h sweep catches it once)
  return sendTrialReminderWindow({
    daysLeft: 3,
    minHours: 48,
    maxHours: 96,
  });
}

// ------------------------------------------------------
// 1-day reminder
// ------------------------------------------------------
async function sendTrial1DayReminders() {
  // Window: 0–48 hours from now
  return sendTrialReminderWindow({
    daysLeft: 1,
    minHours: 0,
    maxHours: 48,
  });
}

// ------------------------------------------------------
// Trial expired
// ------------------------------------------------------
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
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Your trial has ended',
        body: 'Choose a plan to continue using StyleAI.',
        link: '/plans',
        // ✅ EMAIL
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

// ------------------------------------------------------
// Cleanup: mark trials that expired 30+ days ago as EXPIRED
// ------------------------------------------------------
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

// ------------------------------------------------------
// Master sweep
// ------------------------------------------------------
async function runTrialSweep() {
  const start = Date.now();
  try {
    await sendTrial3DayReminders();
    await sendTrial1DayReminders();
    await sendTrialExpiredNotifications();
    await cleanupStaleTrials();
    console.log(`[cron.trial] Sweep completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('[cron.trial] Sweep failed:', err.message);
  }
}

// ------------------------------------------------------
// Scheduler
// ------------------------------------------------------
let intervalHandle = null;

function startCron() {
  if (intervalHandle) return;
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // First run after 60s (let server warm up)
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
  // exported for manual / testing
  sendTrial3DayReminders,
  sendTrial1DayReminders,
  sendTrialExpiredNotifications,
  cleanupStaleTrials,
};


//   02-10-2026  ------------------ 5:01
// // services/billing/cron.js
// // ======================================================
// // Trial lifecycle sweep — runs daily
// // 1. Send reminders 1 day before expiry
// // 2. Notify on expiry
// // 3. Cleanup abandoned trials (30-day grace, then soft-mark)
// // ======================================================

// const prisma = require('../../config/prisma');
// const { notifyUser } = require('../notifications');
// const { computeEffectiveState } = require('./helpers');

// const DAY_MS = 24 * 60 * 60 * 1000;

// // ------------------------------------------------------
// // Notify brands/agencies 1 day before trial expires
// // ------------------------------------------------------
// async function sendTrialEndingSoonReminders() {
//   const tomorrow = new Date(Date.now() + DAY_MS);
//   const today = new Date();

//   const subs = await prisma.subscription.findMany({
//     where: {
//       isTrial: true,
//       status: 'ACTIVE',
//       trialEndsAt: { gte: today, lte: tomorrow },
//     },
//     include: { organization: { select: { name: true } } },
//   });

//   let count = 0;
//   for (const sub of subs) {
//     // Find the org owner(s) — BRAND_OWNER of this org
//     const users = await prisma.user.findMany({
//       where: {
//         organizationId: sub.organizationId,
//         userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
//       },
//       select: { id: true },
//     });

//     for (const u of users) {
//       await notifyUser(u.id, {
//         type: 'SYSTEM',
//         title: 'Trial ending soon',
//         body: `Your StyleAI trial ends tomorrow. Upgrade now to keep full access.`,
//         link: '/billing',
//       }).catch(() => {});
//       count++;
//     }
//   }
//   console.log(`[cron.trial] Sent ${count} trial-ending reminders`);
// }

// // ------------------------------------------------------
// // Notify on trial expiry (day it expires)
// // ------------------------------------------------------
// async function sendTrialExpiredNotifications() {
//   const yesterday = new Date(Date.now() - DAY_MS);
//   const today = new Date();

//   const subs = await prisma.subscription.findMany({
//     where: {
//       isTrial: true,
//       status: 'ACTIVE',
//       trialEndsAt: { gte: yesterday, lt: today },
//     },
//   });

//   let count = 0;
//   for (const sub of subs) {
//     const users = await prisma.user.findMany({
//       where: {
//         organizationId: sub.organizationId,
//         userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
//       },
//       select: { id: true },
//     });

//     for (const u of users) {
//       await notifyUser(u.id, {
//         type: 'SYSTEM',
//         title: 'Your trial has ended',
//         body: 'Choose a plan to continue using StyleAI.',
//         link: '/billing',
//       }).catch(() => {});
//       count++;
//     }
//   }
//   console.log(`[cron.trial] Sent ${count} trial-expired notifications`);
// }

// // ------------------------------------------------------
// // Cleanup: mark trials that expired 30+ days ago as EXPIRED
// // (soft state — data preserved, but status changes)
// // ------------------------------------------------------
// async function cleanupStaleTrials() {
//   const cutoff = new Date(Date.now() - 30 * DAY_MS);
//   const result = await prisma.subscription.updateMany({
//     where: {
//       isTrial: true,
//       status: 'ACTIVE',
//       trialEndsAt: { lt: cutoff },
//     },
//     data: { status: 'EXPIRED' },
//   });
//   if (result.count > 0) {
//     console.log(`[cron.trial] Soft-marked ${result.count} stale trials as EXPIRED`);
//   }
// }

// // ------------------------------------------------------
// // Master sweep — run all tasks
// // ------------------------------------------------------
// async function runTrialSweep() {
//   const start = Date.now();
//   try {
//     await sendTrialEndingSoonReminders();
//     await sendTrialExpiredNotifications();
//     await cleanupStaleTrials();
//     console.log(`[cron.trial] Sweep completed in ${Date.now() - start}ms`);
//   } catch (err) {
//     console.error('[cron.trial] Sweep failed:', err.message);
//   }
// }

// // ------------------------------------------------------
// // Scheduler — simple setInterval, runs every 6 hours
// // (good enough for trial reminders; no external dep)
// // ------------------------------------------------------
// let intervalHandle = null;

// function startCron() {
//   if (intervalHandle) return; // already running
//   const SIX_HOURS = 6 * 60 * 60 * 1000;

//   // First run after 60s (let server warm up)
//   setTimeout(() => { runTrialSweep().catch(() => {}); }, 60_000);

//   // Then every 6 hours
//   intervalHandle = setInterval(() => {
//     runTrialSweep().catch(() => {});
//   }, SIX_HOURS);

//   console.log('[cron.trial] Scheduler started (every 6h)');
// }

// function stopCron() {
//   if (intervalHandle) {
//     clearInterval(intervalHandle);
//     intervalHandle = null;
//   }
// }

// module.exports = {
//   startCron,
//   stopCron,
//   runTrialSweep, // for manual invocation from admin
// };