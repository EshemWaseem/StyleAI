// services/payments/shared/reference.js
const crypto = require('crypto');

function generateReference(prefix = 'TXN') {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${ts}${rand}`;
}

module.exports = { generateReference };