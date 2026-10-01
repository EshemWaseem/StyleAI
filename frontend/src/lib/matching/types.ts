// lib/matching/types.ts
// ======================================================
// Matching domain types — mirrors backend API shape
// ======================================================

export interface MatchReason {
  dimension: string;
  text: string;
  weight: number;
}

export interface MatchBreakdown {
  category: number;
  niche: number;
  engagement: number;
  audience: number;
  price: number;
}

export interface MatchedInfluencer {
  influencer: {
    id: string;
    displayName: string;
    username: string;
    slug: string;
    avatarUrl: string | null;
    bio: string | null;
    categories: string[];
    country: string | null;
    followerCount: number;
    engagementRate: number;
    pricePerPost: number | null;
    currency: string;
    availability: string;
    profileCompleted: boolean;
  };
  score: number;
  breakdown: MatchBreakdown;
  reasons: MatchReason[];
  verdict?: string | null;
  aiPowered?: boolean;
}

export interface ProductMatchResponse {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    price: number | null;
    currency: string | null;
    gender: string | null;
    occasion: string | null;
    primaryImage: string | null;
    brand: { id: string; name: string };
  };
  weights: Record<string, number>;
  totalCandidates: number;
  aiPowered: boolean;
  provider: string;
  model: string | null;
  latencyMs: number;
  matches: MatchedInfluencer[];
}

export interface MatchedProduct {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    price: number | null;
    currency: string | null;
    gender: string | null;
    occasion: string | null;
    primaryImage: string | null;
    brand: { id: string; name: string; slug: string };
  };
  score: number;
  breakdown: MatchBreakdown;
  reasons: MatchReason[];
  verdict?: string | null;
  aiPowered?: boolean;
}

export interface ProductMatchForMeResponse {
  influencer: {
    id: string;
    displayName: string;
    username: string;
    slug: string;
    categories: string[];
  };
  weights: Record<string, number>;
  totalCandidates: number;
  aiPowered: boolean;
  provider: string;
  model: string | null;
  latencyMs: number;
  matches: MatchedProduct[];
}