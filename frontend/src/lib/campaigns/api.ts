// lib/campaigns/api.ts
import { http } from "../api";
import type {
  Campaign,
  CampaignListResponse,
  SubmitAddressInput,
  ShipProductInput,
  SetDeadlineInput,
  AgencyClientEntry,
} from "./types";

export const campaignsApi = {
  list: (filters: { status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<CampaignListResponse>(`/api/campaigns${q ? `?${q}` : ""}`);
  },

  get: (id: string) => http.get<{ campaign: Campaign }>(`/api/campaigns/${id}`),

  update: (id: string, payload: Partial<Campaign>) =>
    http.patch<{ message: string; campaign: Campaign }>(
      `/api/campaigns/${id}`,
      payload
    ),

  complete: (id: string) =>
    http.post<{ message: string; campaign: Campaign }>(
      `/api/campaigns/${id}/complete`,
      {}
    ),

  // ======================================================
  // SHIPPING FLOW
  // ======================================================
  submitAddress: (id: string, payload: SubmitAddressInput) =>
    http.post<{ message: string; campaign: Campaign }>(
      `/api/campaigns/${id}/address`,
      payload
    ),

  ship: (id: string, payload: ShipProductInput) =>
    http.post<{ message: string; campaign: Campaign }>(
      `/api/campaigns/${id}/ship`,
      payload
    ),

  receive: (id: string, payload?: { note?: string }) =>
    http.post<{ message: string; campaign: Campaign }>(
      `/api/campaigns/${id}/receive`,
      payload || {}
    ),

  setDeadline: (id: string, payload: SetDeadlineInput) =>
    http.post<{ message: string; campaign: Campaign }>(
      `/api/campaigns/${id}/deadline`,
      payload
    ),

  // ======================================================
  // CONTENT PIPELINE
  // ======================================================
  submitRaw: (deliverableId: string, payload: any) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/raw`,
      payload
    ),

  startEditing: (deliverableId: string) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/edit`,
      {}
    ),

  submitFinal: (deliverableId: string, payload: any) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/final`,
      payload
    ),

  approveContent: (deliverableId: string) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/approve`,
      {}
    ),

  rejectContent: (deliverableId: string, feedback: string) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/reject`,
      { feedback }
    ),

  publishContent: (deliverableId: string, payload: any) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/publish`,
      payload
    ),

  enterMetrics: (deliverableId: string, payload: any) =>
    http.post<{ message: string; deliverable: any }>(
      `/api/campaigns/deliverables/${deliverableId}/metrics`,
      payload
    ),

  // ======================================================
  // CHAT
  // ======================================================
  listMessages: (campaignId: string, query?: { limit?: number }) => {
    const qs = query?.limit ? `?limit=${query.limit}` : "";
    return http.get<{ messages: any[]; campaignId: string }>(
      `/api/campaigns/${campaignId}/messages${qs}`
    );
  },

  sendMessage: (
    campaignId: string,
    payload: { body: string; attachments?: any[] }
  ) =>
    http.post<{ message: string; chatMessage: any }>(
      `/api/campaigns/${campaignId}/messages`,
      payload
    ),

  markChatRead: (campaignId: string) =>
    http.post<{ message: string }>(
      `/api/campaigns/${campaignId}/messages/read`,
      {}
    ),

  chatUnread: (campaignId: string) =>
    http.get<{ unread: number }>(`/api/campaigns/${campaignId}/messages/unread`),
};

// ======================================================
// AGENCY (kept for compatibility)
// ======================================================
export const agencyApi = {
  listClients: () =>
    http.get<{ clients: AgencyClientEntry[] }>("/api/agency/clients"),
};


// // lib/campaigns/api.ts
// import { http } from "../api";
// import type {
//   Campaign,
//   CampaignListResponse,
//   SubmitAddressInput,
//   ShipProductInput,
//   SetDeadlineInput,
//   AgencyClientEntry,
// } from "./types";

// export const campaignsApi = {
//   list: (filters: { status?: string; limit?: number; offset?: number } = {}) => {
//     const qs = new URLSearchParams();
//     Object.entries(filters).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
//     });
//     const q = qs.toString();
//     return http.get<CampaignListResponse>(`/api/campaigns${q ? `?${q}` : ""}`);
//   },

//   get: (id: string) => http.get<{ campaign: Campaign }>(`/api/campaigns/${id}`),

//   update: (id: string, payload: Partial<Campaign>) =>
//     http.patch<{ message: string; campaign: Campaign }>(
//       `/api/campaigns/${id}`,
//       payload
//     ),

//   complete: (id: string) =>
//     http.post<{ message: string; campaign: Campaign }>(
//       `/api/campaigns/${id}/complete`,
//       {}
//     ),

//   // ======================================================
//   // SHIPPING FLOW
//   // ======================================================
//   submitAddress: (id: string, payload: SubmitAddressInput) =>
//     http.post<{ message: string; campaign: Campaign }>(
//       `/api/campaigns/${id}/address`,
//       payload
//     ),

//   ship: (id: string, payload: ShipProductInput) =>
//     http.post<{ message: string; campaign: Campaign }>(
//       `/api/campaigns/${id}/ship`,
//       payload
//     ),

//   receive: (id: string, payload?: { note?: string }) =>
//     http.post<{ message: string; campaign: Campaign }>(
//       `/api/campaigns/${id}/receive`,
//       payload || {}
//     ),

//   setDeadline: (id: string, payload: SetDeadlineInput) =>
//     http.post<{ message: string; campaign: Campaign }>(
//       `/api/campaigns/${id}/deadline`,
//       payload
//     ),

//   // ======================================================
//   // CONTENT PIPELINE
//   // ======================================================
//   submitRaw: (deliverableId: string, payload: any) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/raw`,
//       payload
//     ),

//   startEditing: (deliverableId: string) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/edit`,
//       {}
//     ),

//   submitFinal: (deliverableId: string, payload: any) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/final`,
//       payload
//     ),

//   approveContent: (deliverableId: string) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/approve`,
//       {}
//     ),

//   rejectContent: (deliverableId: string, feedback: string) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/reject`,
//       { feedback }
//     ),

//   publishContent: (deliverableId: string, payload: any) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/publish`,
//       payload
//     ),

//   enterMetrics: (deliverableId: string, payload: any) =>
//     http.post<{ message: string; deliverable: any }>(
//       `/api/campaigns/deliverables/${deliverableId}/metrics`,
//       payload
//     ),

//   // ======================================================
//   // CHAT
//   // ======================================================
//   listMessages: (campaignId: string) =>
//     http.get<{ messages: any[] }>(`/api/campaigns/${campaignId}/messages`),

//   sendMessage: (campaignId: string, body: string) =>
//     http.post<{ message: any }>(`/api/campaigns/${campaignId}/messages`, {
//       body,
//     }),

//       // (existing: listMessages, sendMessage...)
//   markChatRead: (campaignId: string) =>
//     http.post<{ message: string }>(`/api/campaigns/${campaignId}/messages/read`, {}),

//   chatUnread: (campaignId: string) =>
//     http.get<{ unread: number }>(`/api/campaigns/${campaignId}/messages/unread`),
// };

// // ======================================================
// // AGENCY (kept for compatibility)
// // ======================================================
// export const agencyApi = {
//   listClients: () =>
//     http.get<{ clients: AgencyClientEntry[] }>("/api/agency/clients"),
// };