// backend/src/services/admin/index.js
const dashboard = require('./dashboard');
const users = require('./users');
const brands = require('./brands');
const influencers = require('./influencers');
const agencies = require('./agencies');
const products = require('./products');
const campaigns = require('./campaigns');
const payments = require('./payments');
const helpers = require('./helpers');
const finance = require('./finance');
const settingsService = require('./settingsService');
const auditService = require('./auditService');
const storefront = require('./storefront');

module.exports = {
  ...dashboard,
  ...users,
  ...brands,
  ...influencers,
  ...agencies,
  ...products,
  ...campaigns,
  ...payments,

  // Storefront
  ...storefront,

  // Settings + audit + finance
  getFinanceRules: finance.getFinanceRules,
  updateFinanceRules: finance.updateFinanceRules,
  getAllSettings: helpers.getAllSettings,
  getAllSettingsGrouped: settingsService.getAll,
  updateSettings: settingsService.updateSettings,
  listAuditLogs: auditService.listAuditLogs,
  setSetting: helpers.setSetting,
};