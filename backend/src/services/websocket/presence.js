// services/websocket/presence.js
// ======================================================
// Track online users (in-memory).
// Pattern is Redis-ready — swap Map for Redis hash later.
// ======================================================

// userId -> Set<socketId>
const online = new Map();

function markOnline(userId, socketId) {
  if (!online.has(userId)) online.set(userId, new Set());
  online.get(userId).add(socketId);
}

function markOffline(userId, socketId) {
  const set = online.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    online.delete(userId);
    return false; // user is fully offline
  }
  return true; // still has other tabs open
}

function isOnline(userId) {
  return online.has(userId);
}

function getOnlineUserIds() {
  return Array.from(online.keys());
}

function getSocketCount(userId) {
  return online.get(userId)?.size ?? 0;
}

/**
 * Broadcast presence change to a user's peers.
 * For MVP: just broadcast to their own room (client shows own status).
 * In production: broadcast to all users who have conversations with this user.
 */
function broadcastPresence(io, userId, status) {
  io.to(`user:${userId}`).emit('presence:update', {
    userId,
    status,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  markOnline,
  markOffline,
  isOnline,
  getOnlineUserIds,
  getSocketCount,
  broadcastPresence,
};