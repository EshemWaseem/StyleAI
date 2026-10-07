// controllers/notificationController.js
const svc = require('../services/notifications');
const sse = require('../services/notifications/sse');
const prefs = require('../services/notifications/preferences');

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

async function stream(req, res, next) {
  try {
    const userId = req.user.id;
    const { unread } = await svc.getUnreadCount(req.user);

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    res.write(`event: ready\n`);
    res.write(`data: ${JSON.stringify({ unread })}\n\n`);
    res.flush?.();

    sse.subscribe(userId, res);
  } catch (e) {
    next(e);
  }
}

// ======================================================
// PREFERENCES (email opt-out)
// ======================================================
async function getPreferences(req, res, next) {
  try {
    const preferences = await prefs.getPreferences(req.user.id);
    res.json({ preferences });
  } catch (e) { next(e); }
}

async function updatePreferences(req, res, next) {
  try {
    const updated = await prefs.updatePreferences(req.user.id, req.body || {});
    res.json({ message: 'Preferences updated', preferences: updated });
  } catch (e) { next(e); }
}

// ======================================================
// UNSUBSCRIBE (public — token-based, no auth)
// ======================================================
async function unsubscribe(req, res) {
  const { token, category } = req.query;

  const result = await prefs.unsubscribeByToken(token, category || 'ALL');

  const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0];

  if (!result.ok) {
    return res
      .status(400)
      .send(`
        <!doctype html><html><head><title>StyleAI — Unsubscribe</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        </head><body style="font-family:-apple-system,sans-serif;background:#0a0a0a;color:#fff;
                            display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
          <div style="max-width:420px;padding:32px;text-align:center;">
            <h1 style="color:#c9a86a;font-size:22px;margin:0 0 12px;">Invalid link</h1>
            <p style="color:#6b7280;font-size:14px;">This unsubscribe link is invalid or expired.</p>
            <p style="margin-top:24px;">
              <a href="${frontend}/settings" style="color:#c9a86a;">Go to settings</a>
            </p>
          </div>
        </body></html>
      `);
  }

  return res.send(`
    <!doctype html><html><head><title>StyleAI — Unsubscribed</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head><body style="font-family:-apple-system,sans-serif;background:#0a0a0a;color:#fff;
                        display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
      <div style="max-width:420px;padding:32px;text-align:center;">
        <h1 style="color:#c9a66a;font-size:22px;margin:0 0 12px;color:#c9a86a;">✓ Unsubscribed</h1>
        <p style="color:#6b7280;font-size:14px;">
          You will no longer receive <strong>${result.category === 'ALL' ? 'any' : result.category}</strong> emails from StyleAI.
        </p>
        <p style="color:#6b7280;font-size:12px;margin-top:16px;">
          You can re-enable emails any time from your settings.
        </p>
        <p style="margin-top:24px;">
          <a href="${frontend}/settings" style="color:#c9a86a;">Manage preferences</a>
        </p>
      </div>
    </body></html>
  `);
}

module.exports = {
  list, unreadCount, markRead, markAllRead, remove, stream,
  getPreferences, updatePreferences, unsubscribe,
};