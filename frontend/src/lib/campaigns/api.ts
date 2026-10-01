// lib/campaigns/api.ts
import { http } from "../api";
import type {
  AgencyClientEntry,
  Campaign,
  CampaignListResponse,
  ChatMessage,
  Deliverable,
} from "./types";

// ======================================================
// CAMPAIGNS
// ======================================================
export const campaignsApi = {
  list: (filters: { status?: string; all?: boolean; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<CampaignListResponse>(`/api/campaigns${q ? `?${q}` : ""}`);
  },

  get: (id: string) => http.get<{ campaign: Campaign }>(`/api/campaigns/${id}`),

  update: (id: string, payload: Partial<{
    title: string;
    description: string | null;
    brief: string | null;
    hashtags: string[];
    mentions: string[];
    dueDate: string | null;
    status: string;
  }>) => http.patch<{ message: string; campaign: Campaign }>(`/api/campaigns/${id}`, payload),

  complete: (id: string) =>
    http.post<{ message: string; campaign: Campaign }>(`/api/campaigns/${id}/complete`, {}),

  // ======================================================
  // CONTENT PIPELINE — deliverable-scoped
  // ======================================================
  submitRaw: (deliverableId: string, payload: { files: any[]; caption?: string; notes?: string }) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/raw`, payload
    ),

  startEditing: (deliverableId: string) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/edit`, {}
    ),

  submitFinal: (deliverableId: string, payload: { files: any[]; caption?: string; notes?: string }) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/final`, payload
    ),

  approveContent: (deliverableId: string) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/approve`, {}
    ),

  rejectContent: (deliverableId: string, payload: { feedback: string }) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/reject`, payload
    ),

  publishContent: (deliverableId: string, payload: { platform: string; postUrl: string; postId?: string; notes?: string }) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/publish`, payload
    ),

  enterMetrics: (deliverableId: string, payload: Partial<{
    reach: number; impressions: number; likes: number; comments: number;
    shares: number; clicks: number; conversions: number; revenue: number;
  }>) =>
    http.post<{ message: string; deliverable: Deliverable }>(
      `/api/campaigns/deliverables/${deliverableId}/metrics`, payload
    ),

  // ======================================================
  // CHAT — campaign-scoped
  // ======================================================
  listMessages: (campaignId: string, filters: { limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.limit) qs.set("limit", String(filters.limit));
    const q = qs.toString();
    return http.get<{ messages: ChatMessage[]; campaignId: string }>(
      `/api/campaigns/${campaignId}/messages${q ? `?${q}` : ""}`
    );
  },

  sendMessage: (campaignId: string, payload: { body: string; attachments?: any[] }) =>
    http.post<{ message: string; chatMessage: ChatMessage }>(
      `/api/campaigns/${campaignId}/messages`, payload
    ),

  markChatRead: (campaignId: string) =>
    http.post<{ updated: number }>(`/api/campaigns/${campaignId}/messages/read`, {}),

  chatUnread: (campaignId: string) =>
    http.get<{ unread: number }>(`/api/campaigns/${campaignId}/messages/unread`),
};

// ======================================================
// AGENCY
// ======================================================
export const agencyApi = {
  listClients: () => http.get<{ clients: AgencyClientEntry[] }>("/api/agency/clients"),
};