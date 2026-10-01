// lib/notifications/sse.ts
// ======================================================
// SSE client for live notifications.
// Singleton — one EventSource per browser tab.
// Auto-reconnects with exponential backoff.
// ======================================================

import type { Notification } from './types';

type Listener<T> = (data: T) => void;

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

class NotificationSSE {
  private es: EventSource | null = null;
  private retries = 0;
  private maxRetries = 8;
  private manuallyClosed = false;

  private notificationListeners = new Set<Listener<Notification>>();
  private unreadListeners = new Set<Listener<number>>();
  private readyListeners = new Set<Listener<number>>();

  onNotification(fn: Listener<Notification>) {
    this.notificationListeners.add(fn);
    this.ensureConnected();
    return () => this.notificationListeners.delete(fn);
  }

  onUnread(fn: Listener<number>) {
    this.unreadListeners.add(fn);
    this.ensureConnected();
    return () => this.unreadListeners.delete(fn);
  }

  onReady(fn: Listener<number>) {
    this.readyListeners.add(fn);
    this.ensureConnected();
    return () => this.readyListeners.delete(fn);
  }

  private ensureConnected() {
    if (this.es || this.manuallyClosed) return;
    this.open();
  }

  private open() {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('styleai_token');

    if (!token) {
      // Retry — auth may not be hydrated yet
      this.scheduleReconnect();
      return;
    }

    const url = `${BASE_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`;

    try {
      this.es = new EventSource(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.es.addEventListener('ready', (e: MessageEvent) => {
      this.retries = 0;
      try {
        const data = JSON.parse(e.data);
        this.readyListeners.forEach((fn) => fn(data.unread ?? 0));
        this.unreadListeners.forEach((fn) => fn(data.unread ?? 0));
      } catch { /* ignore */ }
    });

    this.es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const data: Notification = JSON.parse(e.data);
        this.notificationListeners.forEach((fn) => fn(data));
      } catch { /* ignore */ }
    });

    this.es.addEventListener('unread', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.unreadListeners.forEach((fn) => fn(data.unread));
      } catch { /* ignore */ }
    });

    this.es.onerror = () => {
      this.es?.close();
      this.es = null;
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.manuallyClosed) return;
    if (this.retries >= this.maxRetries) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.retries);
    this.retries += 1;
    setTimeout(() => {
      if (!this.manuallyClosed && !this.es) this.open();
    }, delay);
  }

  disconnect() {
    this.manuallyClosed = true;
    this.es?.close();
    this.es = null;
  }

  reconnect() {
    this.manuallyClosed = false;
    this.retries = 0;
    this.es?.close();
    this.es = null;
    this.open();
  }
}

export const notificationsSSE = new NotificationSSE();