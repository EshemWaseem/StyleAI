// lib/chat/api.ts
import { http } from "../api";
import type { Conversation, DirectMessage } from "./types";

export type PartyHit = {
  type: "INFLUENCER" | "ORG";
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  subtitle: string | null;
  slug: string | null;
};

export const chatApi = {
  listConversations: (limit = 50) =>
    http.get<{ conversations: Conversation[]; total: number }>(
      `/api/chat/conversations?limit=${limit}`
    ),

  /** Open a chat with any party: type = "INFLUENCER" | "ORG" */
  openWith: (targetType: "INFLUENCER" | "ORG", targetId: string, context?: string) =>
    http.post<{ conversation: Conversation }>(
      `/api/chat/conversations/with`,
      { type: targetType, id: targetId, context }
    ),

  getConversation: (id: string) =>
    http.get<{ conversation: Conversation }>(`/api/chat/conversations/${id}`),

  listMessages: (id: string, limit = 200) =>
    http.get<{ conversationId: string; messages: DirectMessage[] }>(
      `/api/chat/conversations/${id}/messages?limit=${limit}`
    ),

  sendMessage: (id: string, payload: { body: string; attachments?: any[] }) =>
    http.post<{ message: string; chatMessage: DirectMessage }>(
      `/api/chat/conversations/${id}/messages`,
      payload
    ),

  markRead: (id: string) =>
    http.post<{ ok: boolean }>(`/api/chat/conversations/${id}/read`, {}),

  totalUnread: () =>
    http.get<{ unread: number }>("/api/chat/conversations/unread-count"),

  // NEW — search parties (influencers + agencies) to start a new chat
  searchParties: (q: string, type: "ALL" | "INFLUENCER" | "AGENCY" = "ALL") =>
    http.get<{ parties: PartyHit[] }>(
      `/api/chat/parties?q=${encodeURIComponent(q)}&type=${type}`
    ),
};