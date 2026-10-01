// services/payments/jazzcash/hash.js
const config = require('../../../config/payment_service');
const { hmacSha256, constantTimeCompare } = require('../shared/signature');

function computeHash(payload) {
  const keys = Object.keys(payload)
    .filter((k) => k.startsWith('pp_') && k !== 'pp_SecureHash' && payload[k] != null)
    .sort();

  const values = keys.map((k) => payload[k]);
  const toHash = [config.jazzcash.integritySalt, ...values].join('&');
  return hmacSha256(config.jazzcash.integritySalt, toHash, 'hex').toUpperCase();
}

function verifyHash(payload) {
  const received = payload.pp_SecureHash;
  if (!received) return false;
  return constantTimeCompare(received.toUpperCase(), computeHash(payload));
}

module.exports = { computeHash, verifyHash };