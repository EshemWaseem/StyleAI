// services/queue/jobs/emailSend.js
const { sendMail } = require('../../email/send');

async function processEmailSend(job) {
  const { to, subject, html, text, replyTo, meta } = job.data;
  console.log(`[queue.email] sending "${subject}" → ${to} attempt=${job.attemptsMade + 1}`);

  const result = await sendMail({
    to, subject, html, text, replyTo, meta,
    _noRetry: true, 
  });

  if (!result.ok && result.error !== 'EMAIL_DISABLED') {
    console.error(`[queue.email] FAILED to send "${subject}" to ${to}:`, result.error);
    throw new Error(`sendMail failed: ${result.error}`);
  }
  
  console.log(`[queue.email] SUCCESS: "${subject}" sent to ${to}`);
  return result;
}

module.exports = { processEmailSend };