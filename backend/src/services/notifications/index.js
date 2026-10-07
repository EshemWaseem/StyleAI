// services/notifications/index.js
// ======================================================
// Barrel — public surface of the notifications domain
// ======================================================

const { shapeNotification } = require('./helpers');
const { emitNotification, notifyUser, notifyAdmins } = require('./emit');
const { listMyNotifications, getUnreadCount } = require('./list');
const { markRead, markAllRead } = require('./markRead');
const { deleteNotification } = require('./delete');
const preferences = require('./preferences');

module.exports = {
  // write side
  emitNotification,
  notifyUser,
  notifyAdmins,
  // read side
  listMyNotifications,
  getUnreadCount,
  // mutations
  markRead,
  markAllRead,
  deleteNotification,
  // utilities
  shapeNotification,
  // preferences (email opt-out + unsubscribe)
  preferences,
  // realtime
  eventBus: require('./eventBus'),
  sse: require('./sse'),
};