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
  AgencyAdAccount,
  IntegrationProvider,
} from "./types";

export const agencyProfileApi = {
  getMe: () =>
    http.get<{ profile: AgencyProfile }>("/api/agency/me/profile"),

  update: (payload: UpdateAgencyProfileInput) =>
    http.patch<{ message: string; profile: AgencyProfile }>(
      "/api/agency/me/profile",
      payload
    ),

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

  // ENGAGEMENTS
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

export const agencyIntegrationsApi = {
  list: () =>
    http.get<{ accounts: AgencyAdAccount[] }>("/api/agency/integrations"),

  connect: (provider: IntegrationProvider) =>
    http.get<{ url: string }>(`/api/agency/integrations/${provider}/connect`),

  disconnect: (provider: IntegrationProvider) =>
    http.delete<{ message: string }>(`/api/agency/integrations/${provider}`),
};

export interface ExternalCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: string | null;
  createdAt: string;
}

export const agencyCampaignsApi = {
  createMetaCampaign: (payload: {
    name: string;
    budget: string;
    link: string;
    imageUrl: string;
    adText: string;
    headline?: string;
  }) =>
    http.post<{ message: string; adId: string }>(
      "/api/agency/meta-campaigns",
      payload
    ),

  createGoogleCampaign: (payload: { name: string; budget: string }) =>
    http.post<{ message: string; campaignResourceName: string }>(
      "/api/agency/google-campaigns",
      payload
    ),

  listMetaCampaigns: () =>
    http.get<{ campaigns: ExternalCampaign[] }>("/api/agency/meta-campaigns"),

  toggleMetaCampaign: (id: string, status: "ACTIVE" | "PAUSED") =>
    http.patch<{ success: boolean }>(
      `/api/agency/meta-campaigns/${id}/status`,
      { status }
    ),

  generateAdText: (payload: {
    productName: string;
    category?: string;
    brandVoice?: string;
  }) =>
    http.post<{ adText: string; headline: string }>(
      "/api/agency/meta-campaigns/generate-text",
      payload
    ),

  generateAdImage: (payload: {
    originalImageUrl: string;
    style?: string;
  }) =>
    http.post<{ generatedImageUrl: string }>(
      "/api/agency/meta-campaigns/generate-image",
      payload
    ),

    generateStrategy: (payload: { productName: string; category?: string; price?: number }) =>
    http.post<{ 
      target_audience: string; 
      suggested_budget: string; 
      ad_headline: string; 
      ad_copy: string;
      ai_insight: string;
    }>('/api/agency/meta-campaigns/generate-strategy', payload
    ),

    getMetaCampaignInsights: (id: string) =>
    http.get<{ spend: number; clicks: number; impressions: number; reach: number }>(
      `/api/agency/meta-campaigns/${id}/insights`
    ),


};

export const agencyApi = agencyProfileApi;