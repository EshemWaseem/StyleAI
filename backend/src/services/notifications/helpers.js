// services/notifications/helpers.js
// ======================================================
// Shared utilities for notifications domain
// ======================================================

function shapeNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    meta: n.meta,
    read: n.read,
    readAt: n.readAt,
    createdAt: n.createdAt,
  };
}

module.exports = { shapeNotification };