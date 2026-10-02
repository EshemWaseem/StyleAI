// services/notifications/emit.js
// ======================================================
// Write side — everything that CREATES notifications.
// Publishes to in-process bus → SSE subscribers.
// All emit functions are non-throwing.
//
// ✅ NEW: optional email dispatch via `emailTemplate` +
//    `emailData` fields in the notifyUser payload.
//    Backwards compatible — existing callers unchanged.
// ======================================================

const prisma = require('../../config/prisma');
const bus = require('./eventBus');
const { sendToUser } = require('../email');

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

/**
 * notifyUser — creates an in-app notification.
 * Optionally fires an email if `emailTemplate` is provided.
 *
 * @param {string} userId
 * @param {Object} payload
 *   @param {string}  type              (required) notification type
 *   @param {string}  title             (required) notification title
 *   @param {string}  [body]
 *   @param {string}  [link]
 *   @param {Object}  [meta]
 *   @param {string}  [emailTemplate]   e.g. "offerReceived" — if set, an email fires
 *   @param {Object}  [emailData]       data passed to the email template builder
 */
async function notifyUser(userId, payload) {
  // Split off email-only fields
  const { emailTemplate, emailData, ...notifPayload } = payload || {};

  const result = await emitNotification({ userId, ...notifPayload });

  // Fire email — non-blocking, silent-fail
  if (emailTemplate) {
    sendToUser(userId, emailTemplate, emailData || {})
      .catch((e) => console.error('[notify.email] failed:', e.message));
  }

  return result;
}

async function notifyAdmins(payload) {
  const { emailTemplate, emailData, ...notifPayload } = payload || {};

  try {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: { some: { role: { name: 'SUPER_ADMIN' } } },
      },
      select: { id: true, email: true },
    });
    if (admins.length === 0) return;

    for (const a of admins) {
      await emitNotification({ userId: a.id, ...notifPayload });

      if (emailTemplate) {
        sendToUser(a.id, emailTemplate, emailData || {})
          .catch((e) => console.error('[notify.email admin] failed:', e.message));
      }
    }
  } catch (err) {
    console.error('[notifications.notifyAdmins] failed:', err.message);
  }
}

module.exports = { emitNotification, notifyUser, notifyAdmins };




//  02-10-2026   ----------------  5:01pm
// // services/notifications/emit.js
// // ======================================================
// // Write side — everything that CREATES notifications.
// // Publishes to in-process bus → SSE subscribers.
// // All emit functions are non-throwing.
// // ======================================================

// const prisma = require('../../config/prisma');
// const bus = require('./eventBus');

// async function emitNotification({ userId, type, title, body, link, meta }) {
//   if (!userId) return null;
//   try {
//     const notification = await prisma.notification.create({
//       data: {
//         userId,
//         type,
//         title,
//         body: body ?? null,
//         link: link ?? null,
//         meta: meta ?? undefined,
//       },
//     });

//     // Publish to bus — SSE bridge forwards to connected clients
//     bus.emit('notification', { userId, notification });

//     // Recompute unread count for this user and publish it
//     const unread = await prisma.notification.count({
//       where: { userId, read: false },
//     });
//     bus.emit('unread', { userId, unread });

//     return notification;
//   } catch (err) {
//     console.error('[notifications.emit] failed:', err.message);
//     return null;
//   }
// }

// async function notifyUser(userId, payload) {
//   return emitNotification({ userId, ...payload });
// }

// async function notifyAdmins(payload) {
//   try {
//     const admins = await prisma.user.findMany({
//       where: {
//         isActive: true,
//         userRoles: { some: { role: { name: 'SUPER_ADMIN' } } },
//       },
//       select: { id: true },
//     });
//     if (admins.length === 0) return;

//     for (const a of admins) {
//       await emitNotification({ userId: a.id, ...payload });
//     }
//   } catch (err) {
//     console.error('[notifications.notifyAdmins] failed:', err.message);
//   }
// }

// module.exports = { emitNotification, notifyUser, notifyAdmins };