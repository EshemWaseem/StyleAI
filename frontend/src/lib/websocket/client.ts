// lib/websocket/client.ts
import { io, type Socket } from "socket.io-client";

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function connectSocket(token?: string): Socket | null {
  const authToken =
    token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (!authToken) return null;

  // FIXED: If a socket instance already exists, return it immediately
  if (socket) {
    return socket;
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

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}