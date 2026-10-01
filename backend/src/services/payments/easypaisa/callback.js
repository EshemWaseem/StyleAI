// services/payments/easypaisa/callback.js
const { verifyHash } = require('./hash');
const { SignatureError } = require('../core/errors');

function mapStatus(code) {
  if (code === '0000') return 'SUCCEEDED';
  if (code === '0001') return 'PENDING';
  return 'FAILED';
}

async function handleReturn(payload) {
  if (!verifyHash(payload)) throw new SignatureError('EASYPAISA');

  return {
    provider: 'EASYPAISA',
    reference: payload.orderRefNum,
    amount: Number(payload.amount),
    currency: 'PKR',
    status: mapStatus(payload.status),
    organizationId: payload.mpf1 || null,
    context: payload.mpf2 || null,
    gatewayResponse: payload.desc || payload.errMsg || '',
    raw: payload,
  };
}

module.exports = { handleReturn };