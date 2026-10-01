// lib/chat/types.ts
// ======================================================
// Chat types — supports ANY two-party conversations
// (Brand↔Influencer, Brand↔Agency, Agency↔Influencer)
// ======================================================

export type PartyType = "INFLUENCER" | "ORG";

export interface PartyInfo {
  type: PartyType;
  id: string;

  // Influencer fields (populated when type === "INFLUENCER")
  displayName?: string;
  username?: string;
  slug?: string;
  avatarUrl?: string | null;
  city?: string | null;
  country?: string | null;
  categories?: string[];
  followerCount?: number;
  engagementRate?: number;

  // Organization fields (populated when type === "ORG")
  name?: string;
  logoUrl?: string | null;
  isAgency?: boolean;
}

export interface Conversation {
  id: string;
  contextType: string;          // "DIRECT" | "SERVICE_INQUIRY"
  partyA: PartyInfo;
  partyB: PartyInfo;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastSenderUserId: string | null;
  unreadForA: number;
  unreadForB: number;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: "BRAND" | "AGENCY" | "INFLUENCER" | "ADMIN" | string;
  senderPartyType: PartyType;
  senderPartyId: string;
  body: string;
  attachments: any;
  isMine: boolean;
  createdAt: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface MessageListResponse {
  conversationId: string;
  messages: DirectMessage[];
}