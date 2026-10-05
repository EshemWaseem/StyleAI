// services/email/send.js
// ======================================================
// Send an email.
// - If queue enabled → enqueue on failure (Redis-backed, survives restart)
// - Else → fall back to in-memory retry
// Silent-fail — never crashes the calling request.
// ======================================================
const { getTransporter, fromAddress, EMAIL_ENABLED } = require('./transporter');

async function sendMail({ to, subject, html, text, replyTo, meta, _noRetry }) {
  if (!EMAIL_ENABLED) {
    console.log(`[email] DISABLED — skipping "${subject}" → ${to}`);
    return { ok: false, error: 'EMAIL_DISABLED' };
  }

  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] no transporter — skipping "${subject}" → ${to}`);
    return { ok: false, error: 'NO_TRANSPORTER' };
  }

  try {
    const info = await tx.sendMail({
      from: fromAddress(),
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
      text: text || stripHtml(html),
      replyTo: replyTo || undefined,
    });
    console.log(`[email] ✅ "${subject}" → ${to} (${info.messageId})`, meta || '');
    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error(`[email] ❌ "${subject}" → ${to}:`, err.message);

    if (!_noRetry) {
      // Try Redis queue first, fall back to in-memory
      let enqueued = false;
      try {
        const { enqueueEmail, QUEUE_ENABLED } = require('../queue');
        if (QUEUE_ENABLED) {
          await enqueueEmail({ to, subject, html, text, replyTo, meta });
          enqueued = true;
          console.log(`[email] enqueued for retry via BullMQ`);
        }
      } catch (e) {
        // ignore — fall through to in-memory
      }

      if (!enqueued) {
        try {
          const { enqueue } = require('./retry');
          enqueue({ to, subject, html, text, replyTo, meta, _noRetry: true }, 1);
          console.log(`[email] enqueued for retry via in-memory`);
        } catch (e) {
          console.error('[email.send] failed to enqueue retry:', e.message);
        }
      }
    }

    return { ok: false, error: err.message };
  }
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { sendMail };