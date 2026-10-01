// services/payments/shared/currency.js
const FX = {
  USD_PKR: Number(process.env.USD_PKR_RATE || 278),
};

function usdToPkr(usd) { return Math.round(usd * FX.USD_PKR); }
function pkrToUsd(pkr) { return Number((pkr / FX.USD_PKR).toFixed(2)); }

function formatPkr(amount) { return `PKR ${Number(amount).toLocaleString('en-PK')}`; }
function formatUsd(amount) { return `$${Number(amount).toFixed(2)}`; }

module.exports = { usdToPkr, pkrToUsd, formatPkr, formatUsd, FX };