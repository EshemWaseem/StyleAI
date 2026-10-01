// config/payment_service/jazzcash.js
const { isProd, WEBHOOK_BASE_URL } = require('./shared');

module.exports = {
  enabled: !!process.env.JAZZCASH_MERCHANT_ID,
  merchantId: process.env.JAZZCASH_MERCHANT_ID,
  password: process.env.JAZZCASH_PASSWORD,
  integritySalt: process.env.JAZZCASH_INTEGRITY_SALT,
  returnUrl: process.env.JAZZCASH_RETURN_URL
    || `${WEBHOOK_BASE_URL}/api/webhooks/jazzcash`,
  apiUrl: isProd
    ? 'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction'
    : 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction',
  currency: 'PKR',
  timeoutMs: 45_000,
};