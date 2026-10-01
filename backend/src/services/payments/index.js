// services/payments/index.js
const config = require('../../config/payment_service');
const registry = require('./core/registry');

// Register gateways on boot — only if enabled
if (config.stripe.enabled)    registry.register('STRIPE',    require('./stripe'));
if (config.jazzcash.enabled)  registry.register('JAZZCASH',  require('./jazzcash'));
if (config.easypaisa.enabled) registry.register('EASYPAISA', require('./easypaisa'));
if (config.cod.enabled)       registry.register('COD',       require('./cod'));

module.exports = {
  registry,
  config,
  checkout: require('./checkout'),
  orders:   require('./orders'),
  webhook:  require('./webhook'),
};