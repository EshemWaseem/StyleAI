// services/email/send.js
// ======================================================
// Send an email — silent-fail (never crash the request)
// On failure, auto-enqueues to retry queue (exponential backoff).
// ======================================================
const { getTransporter, fromAddress, EMAIL_ENABLED } = require('./transporter');

/**
 * Send an email.
 * On transient failure, enqueues for automatic retry.
 */
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

    // Enqueue for retry (unless caller opted out, e.g. retry worker itself)
    if (!_noRetry) {
      try {
        const { enqueue } = require('./retry');
        enqueue({ to, subject, html, text, replyTo, meta, _noRetry: true }, 1);
      } catch (e) {
        console.error('[email.send] failed to enqueue retry:', e.message);
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