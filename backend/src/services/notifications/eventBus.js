// services/notifications/eventBus.js
// ======================================================
// In-process event bus for notifications.
// Notification writes publish here; SSE subscribers listen.
// ======================================================

const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(0); // unlimited subscribers

module.exports = bus;