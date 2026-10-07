// lib/offers/types.ts

export type OfferStatus =
  | "DRAFT"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export interface OfferItem {
  platform: string;
  contentType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  label: string;
}

export interface OfferBrand {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface OfferInfluencer {
  id: string;
  userId: string | null;
  displayName: string;
  username: string;
  slug: string;
  avatarUrl: string | null;
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
  brand?: OfferBrand;
  influencer?: OfferInfluencer;
}

export interface OfferListResponse {
  offers: Offer[];
  total: number;
  limit: number;
  offset: number;
}