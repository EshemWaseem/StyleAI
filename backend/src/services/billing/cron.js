// services/billing/cron.js
// ======================================================
// Trial lifecycle sweep — runs daily
// 1. Send reminders 1 day before expiry
// 2. Notify on expiry
// 3. Cleanup abandoned trials (30-day grace, then soft-mark)
// ======================================================

const prisma = require('../../config/prisma');
const { notifyUser } = require('../notifications');
const { computeEffectiveState } = require('./helpers');

const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------
// Notify brands/agencies 1 day before trial expires
// ------------------------------------------------------
async function sendTrialEndingSoonReminders() {
  const tomorrow = new Date(Date.now() + DAY_MS);
  const today = new Date();

  const subs = await prisma.subscription.findMany({
    where: {
      isTrial: true,
      status: 'ACTIVE',
      trialEndsAt: { gte: today, lte: tomorrow },
    },
    include: { organization: { select: { name: true } } },
  });

  let count = 0;
  for (const sub of subs) {
    // Find the org owner(s) — BRAND_OWNER of this org
    const users = await prisma.user.findMany({
      where: {
        organizationId: sub.organizationId,
        userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
      },
      select: { id: true },
    });

    for (const u of users) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Trial ending soon',
        body: `Your StyleAI trial ends tomorrow. Upgrade now to keep full access.`,
        link: '/billing',
      }).catch(() => {});
      count++;
    }
  }
  console.log(`[cron.trial] Sent ${count} trial-ending reminders`);
}

// ------------------------------------------------------
// Notify on trial expiry (day it expires)
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
      select: { id: true },
    });

    for (const u of users) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Your trial has ended',
        body: 'Choose a plan to continue using StyleAI.',
        link: '/billing',
      }).catch(() => {});
      count++;
    }
  }
  console.log(`[cron.trial] Sent ${count} trial-expired notifications`);
}

// ------------------------------------------------------
// Cleanup: mark trials that expired 30+ days ago as EXPIRED
// (soft state — data preserved, but status changes)
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
// Master sweep — run all tasks
// ------------------------------------------------------
async function runTrialSweep() {
  const start = Date.now();
  try {
    await sendTrialEndingSoonReminders();
    await sendTrialExpiredNotifications();
    await cleanupStaleTrials();
    console.log(`[cron.trial] Sweep completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.error('[cron.trial] Sweep failed:', err.message);
  }
}

// ------------------------------------------------------
// Scheduler — simple setInterval, runs every 6 hours
// (good enough for trial reminders; no external dep)
// ------------------------------------------------------
let intervalHandle = null;

function startCron() {
  if (intervalHandle) return; // already running
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // First run after 60s (let server warm up)
  setTimeout(() => { runTrialSweep().catch(() => {}); }, 60_000);

  // Then every 6 hours
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
  runTrialSweep, // for manual invocation from admin
};