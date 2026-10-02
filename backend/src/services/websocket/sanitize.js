// services/websocket/sanitize.js
// ======================================================
// Server-side message sanitization — strip all HTML/script.
// ======================================================

const MAX_BODY = 2000;

function sanitizeBody(input) {
  if (typeof input !== 'string') return '';
  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove control characters except newline/tab
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Trim and cap length
    .trim()
    .slice(0, MAX_BODY);
}

function isValidBody(input) {
  const s = sanitizeBody(input);
  return s.length > 0 && s.length <= MAX_BODY;
}

module.exports = { sanitizeBody, isValidBody, MAX_BODY };