// services/notifications/markRead.js
// ======================================================
// Mark read — single + bulk
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { shapeNotification } = require('./helpers');

async function markRead(user, id) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw httpError('Notification not found', 404, 'NOT_FOUND');
  if (n.userId !== user.id) throw httpError('Forbidden', 403, 'FORBIDDEN');

  if (n.read) return shapeNotification(n);

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true, readAt: new Date() },
  });
  return shapeNotification(updated);
}

async function markAllRead(user) {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  return { updated: result.count };
}

module.exports = { markRead, markAllRead };