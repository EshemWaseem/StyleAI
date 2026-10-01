// config/payment_service/easypaisa.js
const { isProd, WEBHOOK_BASE_URL } = require('./shared');

module.exports = {
  enabled: !!process.env.EASYPAISA_STORE_ID,
  storeId: process.env.EASYPAISA_STORE_ID,
  hashKey: process.env.EASYPAISA_HASH_KEY,
  returnUrl: process.env.EASYPAISA_RETURN_URL
    || `${WEBHOOK_BASE_URL}/api/webhooks/easypaisa`,
  apiUrl: isProd
    ? 'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
    : 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf',
  currency: 'PKR',
  timeoutMs: 45_000,
};