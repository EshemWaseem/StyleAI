// services/notifications/index.js

const { shapeNotification } = require('./helpers');
const { emitNotification, notifyUser, notifyAdmins } = require('./emit');
const { listMyNotifications, getUnreadCount } = require('./list');
const { markRead, markAllRead } = require('./markRead');
const { deleteNotification } = require('./delete');
const preferences = require('./preferences');

module.exports = {
  emitNotification,
  notifyUser,
  notifyAdmins,
  listMyNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  shapeNotification,
  preferences,
  eventBus: require('./eventBus'),
  sse: require('./sse'),
};