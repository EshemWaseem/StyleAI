// services/websocket/auth.js
// ======================================================
// JWT authentication at Socket.IO handshake
// Runs BEFORE the connection is established.
// Rejects invalid/expired tokens immediately.
// ======================================================

const { verifyToken } = require('../../utils/jwt');
const prisma = require('../../config/prisma');

async function authenticateSocket(socket, next) {
  try {
    // Token comes from `auth.token` on the client
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('AUTH_NO_TOKEN'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(new Error('AUTH_INVALID_TOKEN'));
    }

    if (!decoded?.userId) {
      return next(new Error('AUTH_NO_USER_ID'));
    }

    // Load user + roles (minimal — no permissions needed for WS)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        organizationId: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user || !user.isActive) {
      return next(new Error('AUTH_USER_INACTIVE'));
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    // Attach to socket for downstream handlers
    socket.data = {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      roles,
      connectedAt: new Date().toISOString(),
    };

    next();
  } catch (err) {
    console.error('[ws.auth] unexpected error:', err.message);
    next(new Error('AUTH_FAILED'));
  }
}

module.exports = { authenticateSocket };