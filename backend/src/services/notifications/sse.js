// services/notifications/sse.js
// ======================================================
// Server-Sent Events connection registry.
// One Set<res> per userId. Publishes bus events to connected clients.
// ======================================================

const bus = require('./eventBus');
const { shapeNotification } = require('./helpers');

/** Map<userId, Set<express.res>> */
const connections = new Map();

const HEARTBEAT_MS = 25_000;

function subscribe(userId, res) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  const set = connections.get(userId);
  set.add(res);

  // Heartbeat keeps proxies / load balancers from killing the stream
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
      res.flush?.();
    } catch { /* ignore — close handler will clean up */ }
  }, HEARTBEAT_MS);

  const cleanup = () => {
    clearInterval(heartbeat);
    const s = connections.get(userId);
    if (!s) return;
    s.delete(res);
    if (s.size === 0) connections.delete(userId);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  return cleanup;
}

function writeEvent(res, eventName, data) {
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.flush?.();
  } catch { /* ignore */ }
}

function publishToUser(userId, notification) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return;
  const payload = shapeNotification(notification);
  for (const res of set) writeEvent(res, 'notification', payload);
}

function publishUnread(userId, unread) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return;
  for (const res of set) writeEvent(res, 'unread', { unread });
}

function subscriberCount() {
  return connections.size;
}

// ---- Wire bus events to connected clients ----
bus.on('notification', ({ userId, notification }) => publishToUser(userId, notification));
bus.on('unread', ({ userId, unread }) => publishUnread(userId, unread));

module.exports = {
  subscribe,
  publishToUser,
  publishUnread,
  subscriberCount,
};