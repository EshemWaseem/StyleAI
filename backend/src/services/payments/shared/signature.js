// services/payments/shared/signature.js
const crypto = require('crypto');

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hmacSha256(secret, data, encoding = 'hex') {
  return crypto.createHmac('sha256', secret).update(data).digest(encoding);
}

module.exports = { constantTimeCompare, hmacSha256 };