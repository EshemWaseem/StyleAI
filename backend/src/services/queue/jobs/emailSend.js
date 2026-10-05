// services/queue/jobs/emailSend.js
// ======================================================
// Send email via queue (retry-safe).
// ======================================================
const { sendMail } = require('../../email/send');

async function processEmailSend(job) {
  const { to, subject, html, text, replyTo, meta } = job.data;
  console.log(`[queue.email] sending "${subject}" → ${to} attempt=${job.attemptsMade + 1}`);

  const result = await sendMail({
    to, subject, html, text, replyTo, meta,
    _noRetry: true, // prevent in-memory retry double-queueing
  });

  if (!result.ok && result.error !== 'EMAIL_DISABLED') {
    throw new Error(`sendMail failed: ${result.error}`);
  }
  return result;
}

module.exports = { processEmailSend };