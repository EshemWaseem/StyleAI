// services/email/index.js
// ======================================================
// Email service — barrel + high-level helpers.
// sendToUser enforces user notification preferences.
// ======================================================
const { sendMail } = require('./send');
const templates = require('./templates');
const { EMAIL_ENABLED, getTransporter } = require('./transporter');

/**
 * Send a templated email by name.
 */
async function sendEmail(templateName, { to, data = {}, replyTo, meta }) {
  const builder = templates[templateName];
  if (!builder) {
    console.warn(`[email] unknown template "${templateName}"`);
    return { ok: false, error: 'UNKNOWN_TEMPLATE' };
  }

  const { subject, html } = builder(data);

  // Inject unsubscribe link (placeholder-based) — no per-template change needed
  let finalHtml = html;
  if (finalHtml.includes('<!--UNSUBSCRIBE_LINK-->')) {
    if (data.unsubscribeUrl) {
      finalHtml = finalHtml.replace(
        '<!--UNSUBSCRIBE_LINK-->',
        `<a href="${data.unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>`
      );
    } else {
      finalHtml = finalHtml.replace('<!--UNSUBSCRIBE_LINK-->', '');
    }
  }

  return sendMail({ to, subject, html: finalHtml, replyTo, meta });
}

/**
 * Notify a user by id (fetches email, checks preferences).
 * Silent-fail — never blocks a request.
 */
async function sendToUser(userId, templateName, data = {}, opts = {}) {
  try {
    const prisma = require('../../config/prisma');
    const prefs = require('../notifications/preferences');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return { ok: false, error: 'NO_EMAIL' };

    // ---- Preference check ----
    const category = prefs.categoryForTemplate(templateName);
    if (category) {
      const allowed = await prefs.isEmailEnabled(userId, category);
      if (!allowed) {
        console.log(
          `[email] skipped "${templateName}" → ${user.email} (pref disabled: ${category})`
        );
        return { ok: false, skipped: true, reason: 'PREF_DISABLED', category };
      }
    }

    // ---- Unsubscribe URL ----
    const token = await prefs.getUnsubscribeToken(userId);
    const apiBase =
      process.env.API_BASE_URL ||
      process.env.WEBHOOK_BASE_URL ||
      'http://localhost:4000';
    const unsubscribeUrl = token
      ? `${apiBase}/api/notifications/unsubscribe?token=${token}&category=${category || 'ALL'}`
      : null;

    return await sendEmail(templateName, {
      to: user.email,
      data: {
        name: user.name,
        unsubscribeUrl,
        ...data,
      },
      ...opts,
    });
  } catch (err) {
    console.error('[email.sendToUser]', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
  sendToUser,
  sendMail,
  templates,
  EMAIL_ENABLED,
  getTransporter,
};