// services/notifications/list.js
// ======================================================
// Read side — list + count
// ======================================================

const prisma = require('../../config/prisma');
const { parsePagination } = require('../admin/helpers');
const { shapeNotification } = require('./helpers');

async function listMyNotifications(user, query = {}) {
  const { limit, offset } = parsePagination(query);
  const where = { userId: user.id };
  if (query.unread === 'true') where.read = false;

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return {
    notifications: rows.map(shapeNotification),
    total,
    unread,
    limit,
    offset,
  };
}

async function getUnreadCount(user) {
  const count = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });
  return { unread: count };
}

module.exports = { listMyNotifications, getUnreadCount };