// lib/agency/api.ts
import { http } from "../api";
import type {
  AgencyProfile,
  AgencyProfileWithOrg,
  AgencyClientEntry,
  UpdateAgencyProfileInput,
  AgencyServiceType,
  AgencyEngagement,
  CreateEngagementInput,
} from "./types";

export const agencyProfileApi = {
  // ---- Profile ----
  getMe: () =>
    http.get<{ profile: AgencyProfile }>("/api/agency/me/profile"),

  update: (payload: UpdateAgencyProfileInput) =>
    http.patch<{ message: string; profile: AgencyProfile }>(
      "/api/agency/me/profile",
      payload
    ),

  // ---- Directory ----
      browse: (filters: {
    serviceType?: AgencyServiceType;
    serviceGroup?: "BRAND" | "INFLUENCER";
    limit?: number;
  } = {}) => {
    const qs = new URLSearchParams();
    if (filters.serviceType) qs.set("serviceType", filters.serviceType);
    if (filters.serviceGroup) qs.set("serviceGroup", filters.serviceGroup);
    if (filters.limit) qs.set("limit", String(filters.limit));
    const q = qs.toString();
    return http.get<{ agencies: AgencyProfileWithOrg[] }>(
      `/api/agency/browse${q ? `?${q}` : ""}`
    );
  },

  listClients: () =>
    http.get<{ clients: AgencyClientEntry[] }>("/api/agency/clients"),

  serviceTypes: () =>
    http.get<{
      all: AgencyServiceType[];
      brandSide: AgencyServiceType[];
      influencerSide: AgencyServiceType[];
    }>("/api/agency/service-types"),

  // ======================================================
  // ENGAGEMENTS
  // ======================================================
  createEngagement: (payload: CreateEngagementInput) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      "/api/agency/engagements",
      payload
    ),

  listAgencyInbox: (filters: { status?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.limit) qs.set("limit", String(filters.limit));
    const q = qs.toString();
    return http.get<{ engagements: AgencyEngagement[] }>(
      `/api/agency/engagements/inbox${q ? `?${q}` : ""}`
    );
  },

  listMyEngagements: (filters: { status?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.limit) qs.set("limit", String(filters.limit));
    const q = qs.toString();
    return http.get<{ engagements: AgencyEngagement[] }>(
      `/api/agency/engagements/mine${q ? `?${q}` : ""}`
    );
  },

  getEngagement: (id: string) =>
    http.get<{ engagement: AgencyEngagement }>(`/api/agency/engagements/${id}`),

  acceptEngagement: (id: string, payload: { note?: string } = {}) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/accept`,
      payload
    ),

  rejectEngagement: (id: string, payload: { reason: string; note?: string }) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/reject`,
      payload
    ),

  startEngagement: (id: string) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/start`,
      {}
    ),

  completeEngagement: (id: string, payload: { note?: string } = {}) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/complete`,
      payload
    ),

  cancelEngagement: (id: string, payload: { reason?: string } = {}) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/cancel`,
      payload
    ),

  // ======================================================
  // AGENCY DELIVERABLES (Bridge to campaign)
  // ======================================================
  uploadDeliverable: (id: string, payload: { files: any[]; notes?: string }) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/deliverable`,
      payload
    ),

  linkToCampaign: (
    id: string,
    payload: { campaignId: string; deliverableId: string }
  ) =>
    http.post<{ message: string; engagement: AgencyEngagement }>(
      `/api/agency/engagements/${id}/link`,
      payload
    ),
};

// Backward-compat
export const agencyApi = agencyProfileApi;