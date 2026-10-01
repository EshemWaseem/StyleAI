// services/payments/easypaisa/checkout.js
const config = require('../../../config/payment_service');
const { computeHash } = require('./hash');
const { generateReference } = require('../shared/reference');
const { usdToPkr } = require('../shared/currency');

async function create({ amount, currency = 'PKR', description, organization, returnUrl, meta = {} }) {
  const orderRefNum = generateReference('EP');
  const amountPkr = currency === 'USD' ? usdToPkr(amount) : amount;

  const payload = {
    amount: amountPkr.toFixed(2),
    autoRedirect: '1',
    emailAddr: organization?.billingEmail || 'support@styleai.com',
    mobileNum: organization?.billingPhone || '',
    orderRefNum,
    paymentMethod: 'MA',
    postBackURL: returnUrl || config.easypaisa.returnUrl,
    storeId: config.easypaisa.storeId,
    timeStamp: new Date().toISOString(),
    tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
    transactionType: 'MA',
    desc: description || 'Payment',
    mpf1: organization?.id || '',
    mpf2: meta.context || '',
  };
  payload.hashValue = computeHash(payload);

  return {
    url: config.easypaisa.apiUrl,
    method: 'FORM_POST',
    fields: payload,
    reference: orderRefNum,
    amount: amountPkr,
    currency: 'PKR',
  };
}

module.exports = { create };