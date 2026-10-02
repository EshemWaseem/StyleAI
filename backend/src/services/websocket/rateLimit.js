// services/websocket/rateLimit.js
// ======================================================
// In-memory sliding-window rate limiter per socket.
// Not distributed (Redis-ready for future).
// ======================================================

const windows = new Map(); // `${socketId}:${event}` -> { count, resetAt }

function checkRate(socketId, event, maxPerWindow = 20, windowMs = 10_000) {
  const key = `${socketId}:${event}`;
  const now = Date.now();

  let entry = windows.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    windows.set(key, entry);
  }

  entry.count += 1;
  return entry.count <= maxPerWindow;
}

// Cleanup old entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows.entries()) {
    if (now > entry.resetAt) windows.delete(key);
  }
}, 60_000);

module.exports = { checkRate };