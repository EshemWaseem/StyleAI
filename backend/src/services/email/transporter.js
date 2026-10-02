// services/email/transporter.js
// ======================================================
// Gmail SMTP transporter (singleton)
// ======================================================
const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true';

const FROM_NAME  = process.env.EMAIL_FROM_NAME  || 'StyleAI';
const FROM_ADDR  = process.env.EMAIL_FROM_ADDRESS || GMAIL_USER;

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!EMAIL_ENABLED) return null;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('[email] GMAIL_USER or GMAIL_APP_PASSWORD missing — email disabled');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  // Verify on startup (async, don't block)
  transporter.verify()
    .then(() => console.log('[email] Gmail transporter ready'))
    .catch((err) => console.error('[email] Gmail verify failed:', err.message));

  return transporter;
}

function fromAddress() {
  return `"${FROM_NAME}" <${FROM_ADDR}>`;
}

module.exports = { getTransporter, fromAddress, EMAIL_ENABLED };