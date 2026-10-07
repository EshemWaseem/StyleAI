// lib/agency/types.ts

export type AgencyServiceType =
  | "BRAND_SYSTEM_MANAGEMENT"
  | "BRAND_WEBSITE"
  | "BRAND_CAMPAIGN_OPS"
  | "INFLUENCER_PHOTOSHOOT"
  | "INFLUENCER_VIDEOGRAPHY";

export type AgencyEngagementStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface AgencyProfile {
  id: string;
  organizationId: string;
  displayName: string | null;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  serviceTypes: AgencyServiceType[];
  monthlyRetainer: number | null;
  hourlyRate: number | null;
  photoshootRate: number | null;
  videographyRate: number | null;
  currency: string;
  portfolioUrls: string[];
  verified: boolean;
  isAcceptingNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyProfileWithOrg extends AgencyProfile {
  organization: { id: string; name: string; slug: string } | null;
}

export interface AgencyClientEntry {
  id: string;
  status: string;
  clientOrganization: { id: string; name: string; slug: string };
  brands: Array<{ id: string; name: string; slug: string; logoUrl: string | null }>;
}

export interface UpdateAgencyProfileInput {
  displayName?: string | null;
  tagline?: string | null;
  description?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  serviceTypes?: AgencyServiceType[];
  monthlyRetainer?: number | null;
  hourlyRate?: number | null;
  photoshootRate?: number | null;
  videographyRate?: number | null;
  currency?: string;
  portfolioUrls?: string[];
  isAcceptingNew?: boolean;
}

// ======================================================
// ENGAGEMENTS (Sprint C — Hire flow)
// ======================================================
export interface AgencyEngagement {
  id: string;
  agencyOrganizationId: string;
  clientType: "BRAND" | "INFLUENCER";
  brandId: string | null;
  influencerId: string | null;
  hiredByUserId: string;
  serviceType: AgencyServiceType;
  status: AgencyEngagementStatus;
  title: string;
  description: string | null;
  budget: number;
  currency: string;
  deadline: string | null;
  deliverables: any;
  notes: string | null;
  agencyNote: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  // Enriched when listing "mine"
  agencyOrganization?: { id: string; name: string; slug: string } | null;
}

export interface CreateEngagementInput {
  agencyOrganizationId: string;
  serviceType: AgencyServiceType;
  title: string;
  description?: string;
  budget: number;
  currency?: string;
  deadline?: string;
  deliverables?: any;
  notes?: string;
}

// ======================================================
// LABELS
// ======================================================
export const AGENCY_SERVICE_LABELS: Record<AgencyServiceType, string> = {
  BRAND_SYSTEM_MANAGEMENT: "System management",
  BRAND_WEBSITE: "Website handling",
  BRAND_CAMPAIGN_OPS: "Campaign operations",
  INFLUENCER_PHOTOSHOOT: "Photoshoot",
  INFLUENCER_VIDEOGRAPHY: "Videography",
};

export const AGENCY_SERVICE_DESCRIPTIONS: Record<AgencyServiceType, string> = {
  BRAND_SYSTEM_MANAGEMENT: "Manage brand's internal systems & operations",
  BRAND_WEBSITE: "Website, e-commerce & storefront maintenance",
  BRAND_CAMPAIGN_OPS: "Campaign operations & social media handling",
  INFLUENCER_PHOTOSHOOT: "Studio & on-location photoshoots",
  INFLUENCER_VIDEOGRAPHY: "Reels, videos & content production",
};

export const BRAND_SERVICE_TYPES: AgencyServiceType[] = [
  "BRAND_SYSTEM_MANAGEMENT",
  "BRAND_WEBSITE",
  "BRAND_CAMPAIGN_OPS",
];

export const INFLUENCER_SERVICE_TYPES: AgencyServiceType[] = [
  "INFLUENCER_PHOTOSHOOT",
  "INFLUENCER_VIDEOGRAPHY",
];

export const ENGAGEMENT_STATUS_LABELS: Record<AgencyEngagementStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};