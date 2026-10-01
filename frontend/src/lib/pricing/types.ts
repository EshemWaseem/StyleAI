export type PlatformKey =
  | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "PINTEREST"
  | "LINKEDIN" | "SNAPCHAT" | "TWITTER" | "THREADS" | "OTHER";

export interface PlatformCatalogEntry {
  key: PlatformKey;
  label: string;
  contentTypes: string[];
}

/** { INSTAGRAM: { post: 150, reel: 300 }, TIKTOK: { video: 250 } } */
export type PricingTiers = Partial<Record<PlatformKey, Record<string, number>>>;

export interface InfluencerPricing {
  influencerId: string;
  username: string;
  slug: string;
  displayName: string;
  avatarUrl?: string | null;
  currency: string;
  pricingTiers: PricingTiers;
  minBudget: number | null;
  acceptsBundles: boolean | null;
}

export interface UpdatePricingPayload {
  pricingTiers?: PricingTiers;
  currency?: string;
  minBudget?: number | null;
  acceptsBundles?: boolean | null;
}