export interface AnalyticsSummary {
  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  budget?: number;
  earnings?: number;
}

export interface CampaignLite {
  id: string;
  title: string;
  status: string;
  currency: string;
  totalAmount: number;
  revenue: number;
  reach: number;
  brand?: { id: string; name: string; slug?: string };
  influencer?: { id: string; displayName: string; username?: string; avatarUrl?: string | null };
  agency?: { id: string; name: string } | null;
}

export interface InfluencerRollup {
  influencer: { id: string; displayName: string; username: string; avatarUrl: string | null };
  campaigns: number;
  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  budget: number;
}

export interface BrandRollup {
  brand: { id: string; name: string; slug: string };
  campaigns: number;
  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  budget: number;
}

export interface BrandAnalytics {
  summary: AnalyticsSummary;
  roi: number;
  campaignCount: number;
  activeCampaigns: number;
  completedCampaigns: number;
  byInfluencer: InfluencerRollup[];
  recentCampaigns: CampaignLite[];
}

export interface AgencyAnalytics {
  summary: AnalyticsSummary;
  roi: number;
  campaignCount: number;
  activeCampaigns: number;
  byBrand: BrandRollup[];
  recentCampaigns: CampaignLite[];
}

export interface InfluencerAnalytics {
  summary: AnalyticsSummary;
  currency?: string;
  campaignCount: number;
  activeCampaigns: number;
  completedCampaigns: number;
  recentCampaigns: CampaignLite[];
}

export interface PlatformAnalytics {
  offers: { status: string; count: number; totalVolume: number; platformFee: number }[];
  campaigns: {
    count: number;
    reach: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    budgetDeployed: number;
  };
  deliverableTotals: {
    reach: number; impressions: number; likes: number; comments: number;
    shares: number; clicks: number; conversions: number; revenue: number;
  };
  walletsHeld: number;
}