// lib/campaigns/types.ts
// ======================================================
// Campaign + Deliverable + Pipeline types
// ======================================================

export type CampaignStatus =
  | "ACTIVE"
  | "IN_REVIEW"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type SubmissionStage = "RAW" | "FINAL";

export type SubmissionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export type DeliverableStatus =
  // Pipeline stages (agency workflow)
  | "PENDING"
  | "RAW_UPLOADED"
  | "AGENCY_EDITING"
  | "FINAL_UPLOADED"
  | "BRAND_REVIEW"
  | "BRAND_APPROVED"
  | "BRAND_REJECTED"
  | "PUBLISHED"
  | "METRICS_ENTERED"
  | "COMPLETED"
  // Legacy / simple mode
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

// ======================================================
// SUBMISSIONS
// ======================================================
export interface Submission {
  id: string;
  deliverableId: string;
  files: any;
  caption: string | null;
  notes: string | null;
  stage: SubmissionStage;
  status: SubmissionStatus;
  submittedByRole: string | null;
  submittedByAgencyId: string | null;
  feedback: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ======================================================
// PUBLISH + METRICS
// ======================================================
export interface ContentPublish {
  id: string;
  platform: string;
  postUrl: string;
  postId: string | null;
  postedAt: string;
  postedByUserId: string;
  postedByAgencyId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DeliverableMetric {
  id: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  conversions: number;
  revenue: number;
  source: string;
  enteredByUserId: string;
  enteredByAgencyId: string | null;
  createdAt: string;
}

// ======================================================
// DELIVERABLE
// ======================================================
export interface Deliverable {
  id: string;
  campaignId: string;
  platform: string;
  contentType: string;
  quantity: number;
  status: DeliverableStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  submissions?: Submission[];
  publishes?: ContentPublish[];
  metrics?: DeliverableMetric[];
}

// ======================================================
// MESSAGES
// ======================================================
export interface CampaignMessage {
  id: string;
  campaignId: string;
  senderUserId: string;
  senderRole: string;
  body: string;
  attachments: any;
  createdAt: string;
}

// ======================================================
// SUMMARY TYPES (relations)
// ======================================================
export interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  price: number | null;
  currency: string | null;
  primaryImage: string | null;
}

export interface AgencySummary {
  id: string;
  name: string;
  slug: string;
}

// ======================================================
// CAMPAIGN
// ======================================================
export interface Campaign {
  id: string;
  offerId: string;
  brandId: string;
  influencerId: string;
  productId: string | null;
  agencyId: string | null;
  title: string;
  description: string | null;
  currency: string;
  totalAmount: number;
  brief: string | null;
  hashtags: string[];
  mentions: string[];
  startDate: string;
  dueDate: string | null;
  completedAt: string | null;
  status: CampaignStatus;
  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  brand?: { id: string; name: string; slug: string; logoUrl: string | null };
  influencer?: {
    id: string;
    displayName: string;
    username: string;
    slug: string;
    avatarUrl: string | null;
  };
  product?: ProductSummary;
  agency?: AgencySummary;
  deliverables?: Deliverable[];
  messages?: CampaignMessage[];
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
  limit: number;
  offset: number;
}

// ======================================================
// AGENCY
// ======================================================
export interface AgencyClientEntry {
  id: string;
  status: string;
  clientOrganization: { id: string; name: string; slug: string };
  brands: { id: string; name: string; slug: string; logoUrl: string | null }[];
}

export interface ChatMessage {
  id: string;
  campaignId: string;
  senderUserId: string;
  senderRole: "BRAND" | "AGENCY" | "INFLUENCER" | "ADMIN" | string;
  senderAgencyId: string | null;
  body: string;
  attachments: any;
  isMine: boolean;
  createdAt: string;
}