// services/email/retry.js
// ======================================================
// Lightweight in-memory retry queue for failed emails.
// Uses exponential backoff: 30s, 2m, 10m (3 retries).
//
// When we add Redis + BullMQ later, this can be swapped.
// For now: single-process, non-persistent, bounded.
// ======================================================
const { sendMail } = require('./send');

const MAX_RETRIES = 3;
const BACKOFF_MS = [30_000, 120_000, 600_000]; // 30s, 2m, 10m
const MAX_QUEUE = 200; // hard cap to prevent runaway

const queue = [];
let timer = null;

/**
 * Enqueue a failed email for retry.
 * @param {Object} mailArgs - args passed to sendMail
 * @param {number} attempt - current attempt count (starts at 1)
 */
function enqueue(mailArgs, attempt = 1) {
  if (attempt > MAX_RETRIES) {
    console.error('[email.retry] giving up after', MAX_RETRIES, 'retries:', mailArgs.subject);
    return;
  }
  if (queue.length >= MAX_QUEUE) {
    console.warn('[email.retry] queue full, dropping:', mailArgs.subject);
    return;
  }

  const delay = BACKOFF_MS[attempt - 1] || 600_000;
  queue.push({
    args: mailArgs,
    attempt,
    nextAt: Date.now() + delay,
  });

  console.log(`[email.retry] queued "${mailArgs.subject}" (attempt ${attempt}, in ${Math.round(delay / 1000)}s)`);
  schedule();
}

function schedule() {
  if (timer) return;
  timer = setInterval(processQueue, 15_000); // check every 15s
  if (timer.unref) timer.unref(); // don't keep process alive
}

async function processQueue() {
  const now = Date.now();
  const ready = queue.filter((item) => item.nextAt <= now);

  for (const item of ready) {
    const idx = queue.indexOf(item);
    if (idx >= 0) queue.splice(idx, 1);

    try {
      const res = await sendMail(item.args);
      if (res.ok) {
        console.log(`[email.retry] ✅ retry succeeded for "${item.args.subject}" (attempt ${item.attempt})`);
      } else {
        enqueue(item.args, item.attempt + 1);
      }
    } catch (err) {
      console.error('[email.retry] unexpected error:', err.message);
      enqueue(item.args, item.attempt + 1);
    }
  }

  if (queue.length === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
}

function stats() {
  return { queued: queue.length, running: !!timer };
}

module.exports = { enqueue, stats };