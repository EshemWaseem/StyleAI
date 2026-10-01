// services/notifications/emit.js
// ======================================================
// Write side — everything that CREATES notifications.
// Publishes to in-process bus → SSE subscribers.
// All emit functions are non-throwing.
// ======================================================

const prisma = require('../../config/prisma');
const bus = require('./eventBus');

async function emitNotification({ userId, type, title, body, link, meta }) {
  if (!userId) return null;
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
        meta: meta ?? undefined,
      },
    });

    // Publish to bus — SSE bridge forwards to connected clients
    bus.emit('notification', { userId, notification });

    // Recompute unread count for this user and publish it
    const unread = await prisma.notification.count({
      where: { userId, read: false },
    });
    bus.emit('unread', { userId, unread });

    return notification;
  } catch (err) {
    console.error('[notifications.emit] failed:', err.message);
    return null;
  }
}

async function notifyUser(userId, payload) {
  return emitNotification({ userId, ...payload });
}

async function notifyAdmins(payload) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: { some: { role: { name: 'SUPER_ADMIN' } } },
      },
      select: { id: true },
    });
    if (admins.length === 0) return;

    for (const a of admins) {
      await emitNotification({ userId: a.id, ...payload });
    }
  } catch (err) {
    console.error('[notifications.notifyAdmins] failed:', err.message);
  }
}

module.exports = { emitNotification, notifyUser, notifyAdmins };