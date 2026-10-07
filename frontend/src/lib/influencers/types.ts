// lib/influencers/types.ts
// ======================================================
// Influencer types — includes rating + order count
// ======================================================

export type InfluencerPlatform =
  | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "PINTEREST"
  | "LINKEDIN" | "SNAPCHAT" | "TWITTER" | "THREADS" | "OTHER";

export type InfluencerStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type InfluencerAvailability = "AVAILABLE" | "BOOKED" | "UNAVAILABLE";

export interface InfluencerSocialAccount {
  id: string;
  platform: InfluencerPlatform;
  platformCustom: string | null;
  handle: string;
  profileUrl: string | null;
  followerCount: number;
  followingCount: number;
  engagementRate: number;
  isPrimary: boolean;
}

export interface InfluencerAudienceMetrics {
  ageDistribution: Record<string, number> | null;
  genderDistribution: Record<string, number> | null;
  topCountries: Array<{ country: string; pct: number }> | null;
  interests: string[];
  audienceQuality: number | null;
  fakeFollowerPct: number | null;
}

export interface Influencer {
  id: string;
  userId: string | null;
  displayName: string;
  username: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;

  // ✅ Rating + completed orders
  rating: number | null;
  totalOrders: number;
  completedCampaigns: number;

  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  language: string | null;
  gender: string | null;
  ageGroup: string | null;
  followerCount: number;
  followingCount: number;
  engagementRate: number;
  categories: string[];
  audienceFavorites: string[];
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  pricePerPost: number | null;
  currency: string;
  availability: InfluencerAvailability;
  status: InfluencerStatus;
  pricingTiers: Record<string, number> | null;
  portfolio: any[] | null;
  fashionScore: number | null;
  luxuryScore: number | null;
  beautyScore: number | null;
  lifestyleScore: number | null;
  profileCompleted: boolean;
  socialAccounts: InfluencerSocialAccount[];
  audienceMetrics: InfluencerAudienceMetrics | null;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerInput {
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  language?: string;
  gender?: string;
  ageGroup?: string;
  followerCount?: number;
  followingCount?: number;
  engagementRate?: number;
  categories?: string[];
  audienceFavorites?: string[];
  avgViews?: number;
  avgLikes?: number;
  avgComments?: number;
  pricePerPost?: number | null;
  currency?: string;
  availability?: InfluencerAvailability;
  pricingTiers?: Record<string, number>;
  socialAccounts?: Array<{
    platform: InfluencerPlatform;
    platformCustom?: string;
    handle: string;
    profileUrl?: string;
    followerCount?: number;
    followingCount?: number;
    engagementRate?: number;
    isPrimary?: boolean;
  }>;
  audienceMetrics?: Partial<InfluencerAudienceMetrics>;
}

export interface InfluencerFilters {
  q?: string;
  platform?: InfluencerPlatform;
  country?: string;
  categories?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  availability?: InfluencerAvailability;
  saved?: "true" | "false";
  limit?: number;
  offset?: number;
}