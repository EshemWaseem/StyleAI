import { http } from "../api";
import type {
  InfluencerPricing,
  PlatformCatalogEntry,
  UpdatePricingPayload,
} from "./types";

export const pricingApi = {
  /** Full platform vocabulary — used to render the pricing grid */
  listPlatforms: () =>
    http.get<{ platforms: PlatformCatalogEntry[] }>("/api/catalog/platforms"),

  /** Current pricing of one influencer (public view) */
  getPricing: (influencerId: string) =>
    http.get<{ pricing: InfluencerPricing }>(`/api/influencers/${influencerId}/pricing`),

  /** Update own pricing (influencer/owner/admin) */
  updatePricing: (influencerId: string, payload: UpdatePricingPayload) =>
    http.patch<{ message: string; influencer: any }>(
      `/api/influencers/${influencerId}/pricing`,
      payload
    ),
};