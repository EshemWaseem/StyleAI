// config/payment_service/cod.js
module.exports = {
  enabled: true,
  minOrderAmount: Number(process.env.COD_MIN_AMOUNT || 500),
  maxOrderAmount: Number(process.env.COD_MAX_AMOUNT || 200_000),
  autoConfirmDays: Number(process.env.COD_AUTO_CONFIRM_DAYS || 7),
  currency: 'PKR',
};