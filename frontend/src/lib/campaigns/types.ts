// lib/campaigns/types.ts

export type CampaignStatus =
  | "AWAITING_ADDRESS"
  | "ADDRESS_SUBMITTED"
  | "SHIPPED"
  | "IN_PRODUCTION"
  | "ACTIVE"
  | "IN_REVIEW"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type DeliverableStatus =
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
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  notes?: string | null;
}

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

  shippingAddress: ShippingAddress | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  contentDeadline: string | null;

  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;

  brand?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  influencer?: {
    id: string;
    displayName: string;
    username: string;
    slug: string;
    avatarUrl: string | null;
  };
  product?: {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    price: number | null;
    currency: string | null;
    primaryImage: string | null;
  };
  agency?: { id: string; name: string; slug: string };
  deliverables?: Deliverable[];
  messages?: CampaignMessage[];

  createdAt: string;
  updatedAt: string;
}

export interface Deliverable {
  id: string;
  campaignId: string;
  platform: string;
  contentType: string;
  quantity: number;
  status: DeliverableStatus;
  dueDate: string | null;
  submissions?: Submission[];
  publishes?: Publish[];
  metrics?: Metric[];
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  deliverableId: string;
  files: any;
  caption: string | null;
  notes: string | null;
  stage: "RAW" | "FINAL";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  iteration: number;
  isLatest: boolean;
  submittedByRole: string | null;
  submittedByAgencyId: string | null;
  feedback: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Publish {
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

export interface Metric {
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

export interface CampaignMessage {
  id: string;
  campaignId: string;
  senderUserId: string;
  senderRole: string;
  body: string;
  attachments: any;
  createdAt: string;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubmitAddressInput {
  address: ShippingAddress;
}

export interface ShipProductInput {
  carrier: string;
  trackingNumber: string;
  note?: string;
}

export interface SetDeadlineInput {
  contentDeadline: string;
}

export interface AgencyClientEntry {
  id: string;
  status: string;
  clientOrganization: { id: string; name: string; slug: string };
  brands: Array<{ id: string; name: string; slug: string; logoUrl: string | null }>;
}