import { http } from "../api";
import type { AssistantMessage, ChatResponse, Conversation } from "./types";

export const assistantApi = {
  chat: (message: string, conversationId?: string) =>
    http.post<ChatResponse>("/api/assistant/chat", { message, conversationId }),

  listConversations: () =>
    http.get<{ conversations: Conversation[] }>("/api/assistant/conversations"),

  getConversation: (id: string) =>
    http.get<{ id: string; title: string | null; messages: AssistantMessage[] }>(
      `/api/assistant/conversations/${id}`
    ),

  deleteConversation: (id: string) =>
    http.delete<{ id: string }>(`/api/assistant/conversations/${id}`),
};