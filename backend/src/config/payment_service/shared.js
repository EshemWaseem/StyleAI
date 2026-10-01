// config/payment_service/shared.js
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const FRONTEND_URL   = process.env.FRONTEND_URL   || 'http://localhost:3000';
const API_BASE_URL   = process.env.API_BASE_URL   || 'http://localhost:4000';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || API_BASE_URL;

module.exports = { isProd, isTest, FRONTEND_URL, API_BASE_URL, WEBHOOK_BASE_URL };