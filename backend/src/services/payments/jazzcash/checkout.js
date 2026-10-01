// services/payments/jazzcash/checkout.js
const config = require('../../../config/payment_service');
const { computeHash } = require('./hash');
const { generateReference } = require('../shared/reference');
const { usdToPkr } = require('../shared/currency');

async function create({ amount, currency = 'PKR', description, organization, returnUrl, meta = {} }) {
  const now = new Date();
  const txnDateTime = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const txnRefNo = generateReference('JC');
  const txnExpiry = new Date(now.getTime() + 3600_000)
    .toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

  const amountPkr = currency === 'USD' ? usdToPkr(amount) : Math.round(amount);

  const payload = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: config.jazzcash.merchantId,
    pp_SubMerchantID: '',
    pp_Password: config.jazzcash.password,
    pp_BankID: 'TBANK',
    pp_ProductID: 'RETL',
    pp_TxnRefNo: txnRefNo,
    pp_Amount: String(amountPkr * 100),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: meta.billReference || txnRefNo,
    pp_Description: description || 'Payment',
    pp_TxnExpiryDateTime: txnExpiry,
    pp_ReturnURL: returnUrl || config.jazzcash.returnUrl,
    pp_SecureHash: '',
    ppmpf_1: organization?.id || '',
    ppmpf_2: meta.context || '',
  };
  payload.pp_SecureHash = computeHash(payload);

  return {
    url: config.jazzcash.apiUrl,
    method: 'FORM_POST',
    fields: payload,
    reference: txnRefNo,
    amount: amountPkr,
    currency: 'PKR',
  };
}

module.exports = { create };