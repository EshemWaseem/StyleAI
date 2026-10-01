// controllers/notificationController.js
const svc = require('../services/notifications');
const sse = require('../services/notifications/sse');

async function list(req, res, next) {
  try { res.json(await svc.listMyNotifications(req.user, req.query)); }
  catch (e) { next(e); }
}

async function unreadCount(req, res, next) {
  try { res.json(await svc.getUnreadCount(req.user)); }
  catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try { res.json({ message: 'Marked read', notification: await svc.markRead(req.user, req.params.id) }); }
  catch (e) { next(e); }
}

async function markAllRead(req, res, next) {
  try { res.json({ message: 'All marked read', ...(await svc.markAllRead(req.user)) }); }
  catch (e) { next(e); }
}

async function remove(req, res, next) {
  try { res.json({ message: 'Deleted', ...(await svc.deleteNotification(req.user, req.params.id)) }); }
  catch (e) { next(e); }
}

/**
 * GET /api/notifications/stream
 * Server-Sent Events — real-time notifications + unread count.
 */
async function stream(req, res, next) {
  try {
    const userId = req.user.id;
    const { unread } = await svc.getUnreadCount(req.user);

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disables nginx buffering if behind proxy
    });
    res.flushHeaders?.();

    // Initial handshake — send current unread count
    res.write(`event: ready\n`);
    res.write(`data: ${JSON.stringify({ unread })}\n\n`);
    res.flush?.();

    // Register this connection (cleanup handled on close/error)
    sse.subscribe(userId, res);

    // NOTE: no res.end() here — the stream stays open until client disconnects
  } catch (e) {
    next(e);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead, remove, stream };