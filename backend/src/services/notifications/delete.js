// services/notifications/delete.js
// ======================================================
// Delete one notification — owner only
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

async function deleteNotification(user, id) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw httpError('Notification not found', 404, 'NOT_FOUND');
  if (n.userId !== user.id) throw httpError('Forbidden', 403, 'FORBIDDEN');

  await prisma.notification.delete({ where: { id } });
  return { id };
}

module.exports = { deleteNotification };