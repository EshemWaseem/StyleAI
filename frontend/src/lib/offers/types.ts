export type OfferStatus =
  | "DRAFT"
  | "PENDING_ADMIN"
  | "ADMIN_APPROVED"
  | "ADMIN_REJECTED"
  | "INFLUENCER_ACCEPTED"
  | "INFLUENCER_DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export interface OfferItem {
  platform: string;        // Prisma InfluencerPlatform key
  contentType: string;     // e.g. "reel"
  quantity: number;
  unitPrice: number;
  lineTotal: number;       // server-computed
  label: string;           // display snapshot
}

export interface Offer {
  id: string;
  brandId: string;
  influencerId: string;
  productId: string | null;
  title: string | null;
  items: OfferItem[];
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  adminFeePct: number;
  adminFee: number;
  total: number;
  currency: string;
  status: OfferStatus;
  brandNote: string | null;
  adminNote: string | null;
  influencerNote: string | null;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    currency: string;
  };
}

export interface OfferEstimate {
  items: OfferItem[];
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  adminFeePct: number;
  adminFee: number;
  total: number;
  currency: string;
}

export interface CreateOfferPayload {
  brandId: string;
  influencerId: string;
  productId?: string;
  title?: string;
  items: Array<{
    platform: string;
    contentType: string;
    quantity: number;
    unitPrice: number;
  }>;
  brandNote?: string;
  expiresAt?: string;
}

export interface OfferListResponse {
  offers: Offer[];
  total: number;
  limit: number;
  offset: number;
}