export type ListingStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "CLAIMED";

export interface ListingItem {
  platform: string;
  contentType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  label: string;
}

export interface Listing {
  id: string;
  influencerId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  items: ListingItem[];
  subtotal: number;
  currency: string;
  validDays: number;
  expiresAt: string;
  status: ListingStatus;
  viewCount: number;
  claimCount: number;
  claimedByBrandId: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  influencer?: {
    id: string;
    displayName: string;
    username: string;
    slug: string;
    avatarUrl: string | null;
    categories: string[];
    followerCount: number;
    engagementRate: number;
  };
}

export interface ListingListResponse {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateListingPayload {
  title: string;
  description?: string | undefined;
  coverImageUrl?: string | undefined;
  items: { platform: string; contentType: string; quantity: number; unitPrice: number }[];
  validDays: number;
}