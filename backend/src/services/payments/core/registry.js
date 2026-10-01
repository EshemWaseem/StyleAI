// services/payments/core/registry.js
const gateways = new Map();

function register(name, instance) {
  if (gateways.has(name)) throw new Error(`Gateway ${name} already registered`);
  gateways.set(name, instance);
}

function get(name) {
  const gw = gateways.get(name);
  if (!gw) throw new Error(`Unknown gateway: ${name}`);
  return gw;
}

function list() { return [...gateways.keys()]; }
function has(name) { return gateways.has(name); }

module.exports = { register, get, list, has };