import { http } from "../api";
import type { Notification, NotificationListResponse } from "./types";

export const notificationsApi = {
  list: (filters: { unread?: boolean; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.unread) qs.set("unread", "true");
    if (filters.limit) qs.set("limit", String(filters.limit));
    if (filters.offset) qs.set("offset", String(filters.offset));
    const q = qs.toString();
    return http.get<NotificationListResponse>(`/api/notifications${q ? `?${q}` : ""}`);
  },
  unreadCount: () =>
    http.get<{ unread: number }>("/api/notifications/unread-count"),
  markRead: (id: string) =>
    http.post<{ message: string; notification: Notification }>(`/api/notifications/${id}/read`, {}),
  markAllRead: () =>
    http.post<{ message: string; updated: number }>("/api/notifications/read-all", {}),
  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/notifications/${id}`),
};