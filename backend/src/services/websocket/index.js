// services/websocket/index.js
// ======================================================
// Socket.IO server — attached to Express HTTP server
// ======================================================

const { Server } = require('socket.io');
const { authenticateSocket } = require('./auth');
const { registerDirectChatHandlers } = require('./handlers/directChat');
const { registerCampaignChatHandlers } = require('./handlers/campaignChat');
const { registerTypingHandlers } = require('./handlers/typing');
const { registerReadHandlers } = require('./handlers/read');
const presence = require('./presence');

let io = null;

function initWebSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: '/socket.io',
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e5, // 100KB max message
    transports: ['websocket', 'polling'], // WS preferred, polling fallback
  });

  // ---- Auth middleware — runs BEFORE connection opens ----
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { userId, organizationId, roles } = socket.data;
    console.log(`[ws] connected: user=${userId} org=${organizationId} socket=${socket.id}`);

    // Join personal room — only this user receives events here
    socket.join(`user:${userId}`);

    // Presence tracking
    presence.markOnline(userId, socket.id);

    // Broadcast presence to relevant peers
    presence.broadcastPresence(io, userId, 'online');

    // Register event handlers
    registerDirectChatHandlers(io, socket);
    registerCampaignChatHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerReadHandlers(io, socket);

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[ws] disconnected: user=${userId} reason=${reason}`);
      const stillOnline = presence.markOffline(userId, socket.id);
      if (!stillOnline) {
        presence.broadcastPresence(io, userId, 'offline');
      }
    });

    // Error
    socket.on('error', (err) => {
      console.error(`[ws] socket error user=${userId}:`, err.message);
    });
  });

  console.log('[ws] Socket.IO server initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function hasIO() {
  return io !== null;
}

module.exports = { initWebSocket, getIO, hasIO };