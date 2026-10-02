// lib/websocket/client.ts
import { io, type Socket } from "socket.io-client";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Connect (or reuse) the WebSocket.
 * Call this once after login. Returns null if no token.
 */
export function connectSocket(token?: string): Socket | null {
  const authToken =
    token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (!authToken) return null;

  // Already connected — reuse
  if (socket?.connected) return socket;

  // Cleanup stale socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(BASE_URL, {
    path: "/socket.io",
    auth: { token: authToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 20000,
    autoConnect: true,
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("[ws] connected:", socket?.id);
  });
  socket.on("disconnect", (reason) => {
    console.log("[ws] disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.warn("[ws] connect_error:", err.message);
  });

  return socket;
}

/** Get the active socket (may be null before login). */
export function getSocket(): Socket | null {
  return socket;
}

/** Disconnect on logout. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}