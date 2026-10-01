// lib/recommendations/types.ts
export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  action: string;
  confidence: number;         // 0-100
  category?: string;          // "roi" | "escrow" | "category" | "campaign"
  link?: string;              // optional navigation
  meta?: Record<string, any>;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  generatedAt: string;
  cached: boolean;
}