// lib/websocket/hooks.ts
// ======================================================
// Real-time event subscription hook — no polling, no reload.
// ======================================================
import { useEffect, useRef } from "react";
import { getSocket } from "./client";

/**
 * Subscribe to a Socket.IO event.
 * Handler is always fresh (uses ref) — no re-subscribe on re-render.
 *
 * Usage:
 *   useRealtimeEvent("offer:updated", (data) => { ... });
 */
export function useRealtimeEvent<T = any>(
  event: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      // Socket not ready yet — retry briefly (once user logged in)
      const t = setTimeout(() => {
        const s = getSocket();
        if (!s) return;
        const fn = (data: T) => handlerRef.current(data);
        s.on(event, fn);
      }, 500);
      return () => clearTimeout(t);
    }

    const fn = (data: T) => handlerRef.current(data);
    socket.on(event, fn);
    return () => {
      socket.off(event, fn);
    };
  }, [event]);
}

/**
 * Subscribe to multiple events at once.
 * handlers: { "offer:created": fn, "offer:updated": fn, ... }
 */
export function useRealtimeEvents(handlers: Record<string, (data: any) => void>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const fns: Array<[string, (data: any) => void]> = Object.keys(handlersRef.current).map(
      (event) => {
        const fn = (data: any) => handlersRef.current[event]?.(data);
        socket.on(event, fn);
        return [event, fn];
      }
    );

    return () => {
      fns.forEach(([event, fn]) => socket.off(event, fn));
    };
  }, []);
}