export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  sources: { source: string; similarity: number }[];
}

export interface Conversation {
  id: string;
  title: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
}