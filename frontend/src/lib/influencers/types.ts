// lib/influencers/types.ts
export type InfluencerPlatform =
  | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "PINTEREST"
  | "LINKEDIN" | "SNAPCHAT" | "TWITTER" | "THREADS" | "OTHER";

export type InfluencerStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type InfluencerAvailability = "AVAILABLE" | "BOOKED" | "UNAVAILABLE";

// NEW
export type EngagementHealth = "EXCELLENT" | "GOOD" | "SUSPICIOUS" | "FAKE";

export type SuspiciousFlag =
  | "HIGH_FOLLOW_RATIO" | "ELEVATED_FOLLOW_RATIO"
  | "VERY_LOW_ENGAGEMENT" | "LOW_ENGAGEMENT" | "BELOW_AVERAGE_ENGAGEMENT"
  | "HIGH_ENGAGEMENT" | "NO_POSTS_AVAILABLE"
  | "INACTIVE_90D" | "INACTIVE_30D"
  | "NO_POST_TIMESTAMPS" | "LOW_POST_COUNT";

export interface RecentPost {
  id?: string | null;
  shortCode?: string | null;
  url?: string | null;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  likesCount: number;
  commentsCount: number;
  videoViewCount: number;
  sharesCount: number;
  timestamp: string | null;
  isVideo: boolean;
}

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

  // NEW: analytics
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;

  authenticityScore: number | null;
  engagementHealth: EngagementHealth | null;
  suspiciousFlags: SuspiciousFlag[];

  lastPostAt: string | null;
  scrapedAt: string | null;
  scrapeData: { recentPosts?: RecentPost[] } | null;
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
    // NEW
    totalPosts?: number;
    totalLikes?: number;
    totalComments?: number;
    totalViews?: number;
    avgLikes?: number;
    avgComments?: number;
    avgViews?: number;
    authenticityScore?: number | null;
    engagementHealth?: EngagementHealth | null;
    suspiciousFlags?: SuspiciousFlag[];
    lastPostAt?: string | null;
    scrapedAt?: string | null;
    scrapeData?: any;
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