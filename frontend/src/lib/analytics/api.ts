import { http } from "../api";
import type {
  AgencyAnalytics, BrandAnalytics, InfluencerAnalytics, PlatformAnalytics,
} from "./types";

export const analyticsApi = {
  platform: () => http.get<PlatformAnalytics>("/api/analytics/platform"),
  brand: () => http.get<BrandAnalytics>("/api/analytics/brand"),
  agency: () => http.get<AgencyAnalytics>("/api/analytics/agency"),
  influencer: () => http.get<InfluencerAnalytics>("/api/analytics/influencer"),
};