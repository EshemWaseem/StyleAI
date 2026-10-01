// services/payments/easypaisa/hash.js
const config = require('../../../config/payment_service');
const { hmacSha256, constantTimeCompare } = require('../shared/signature');

function computeHash(payload) {
  const keys = Object.keys(payload)
    .filter((k) => k !== 'hashValue' && k !== '' && payload[k] != null)
    .sort();

  const values = keys.map((k) => String(payload[k]));
  const toHash = values.join('&');
  return hmacSha256(config.easypaisa.hashKey, toHash, 'base64');
}

function verifyHash(payload) {
  const received = payload.hashValue;
  if (!received) return false;
  return constantTimeCompare(received, computeHash(payload));
}

module.exports = { computeHash, verifyHash };