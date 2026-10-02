// config/payment_service/shared.js
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// FRONTEND_URL may contain multiple comma-separated origins (for CORS).
// For redirects (Stripe/JazzCash/Easypaisa), we need a SINGLE valid URL.
const FRONTEND_URL_RAW = process.env.FRONTEND_URL || 'http://localhost:3000';
const FRONTEND_URLS = FRONTEND_URL_RAW.split(',')
  .map((u) => u.trim())
  .filter(Boolean);
const FRONTEND_URL = FRONTEND_URLS[0] || 'http://localhost:3000';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || API_BASE_URL;

module.exports = {
  isProd,
  isTest,
  FRONTEND_URL,     // single URL for redirects
  FRONTEND_URLS,    // array (optional, for future use)
  API_BASE_URL,
  WEBHOOK_BASE_URL,
};