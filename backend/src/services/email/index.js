// services/email/index.js
// ======================================================
// Email service — barrel + high-level helpers
// ======================================================
const { sendMail } = require('./send');
const templates = require('./templates');
const { EMAIL_ENABLED, getTransporter } = require('./transporter');

/**
 * Send a templated email by name.
 *
 * Usage:
 *   await sendEmail('welcome', { to, data: { name, role } });
 *   await sendEmail('offerReceived', { to, data: {...} });
 */
async function sendEmail(templateName, { to, data = {}, replyTo, meta }) {
  const builder = templates[templateName];
  if (!builder) {
    console.warn(`[email] unknown template "${templateName}"`);
    return { ok: false, error: 'UNKNOWN_TEMPLATE' };
  }

  const { subject, html } = builder(data);
  return sendMail({ to, subject, html, replyTo, meta });
}

/**
 * Higher-level: notify a user by id (fetches email).
 * Silent-fail — never block a request on email failure.
 */
async function sendToUser(userId, templateName, data = {}, opts = {}) {
  try {
    const prisma = require('../../config/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return { ok: false, error: 'NO_EMAIL' };
    return await sendEmail(templateName, {
      to: user.email,
      data: { name: user.name, ...data },
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