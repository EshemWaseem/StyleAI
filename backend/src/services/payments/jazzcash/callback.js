// services/payments/jazzcash/callback.js
const { verifyHash } = require('./hash');
const { SignatureError } = require('../core/errors');

function mapStatus(code) {
  if (code === '000') return 'SUCCEEDED';
  if (code === '121' || code === '124') return 'PENDING';
  return 'FAILED';
}

async function handleReturn(payload) {
  if (!verifyHash(payload)) throw new SignatureError('JAZZCASH');

  return {
    provider: 'JAZZCASH',
    reference: payload.pp_TxnRefNo,
    amount: Number(payload.pp_Amount) / 100,
    currency: payload.pp_TxnCurrency || 'PKR',
    status: mapStatus(payload.pp_ResponseCode),
    organizationId: payload.ppmpf_1 || null,
    context: payload.ppmpf_2 || null,
    gatewayResponse: payload.pp_ResponseMessage || '',
    raw: payload,
  };
}

module.exports = { handleReturn };