// lib/matching/api.ts
import { http } from "../api";
import type { ProductMatchForMeResponse, ProductMatchResponse } from "./types";

export const matchingApi = {
  /** Brand/agency: rank influencers for a product */
  forProduct: (
    productId: string,
    filters: { limit?: number; minScore?: number } = {}
  ) => {
    const qs = new URLSearchParams();
    if (filters.limit) qs.set("limit", String(filters.limit));
    if (filters.minScore) qs.set("minScore", String(filters.minScore));
    const q = qs.toString();
    return http.get<ProductMatchResponse>(
      `/api/matching/products/${productId}${q ? `?${q}` : ""}`
    );
  },

  /** Influencer: rank products for my profile */
  forMe: (filters: { limit?: number; minScore?: number } = {}) => {
    const qs = new URLSearchParams();
    if (filters.limit) qs.set("limit", String(filters.limit));
    if (filters.minScore) qs.set("minScore", String(filters.minScore));
    const q = qs.toString();
    return http.get<ProductMatchForMeResponse>(
      `/api/matching/me/products${q ? `?${q}` : ""}`
    );
  },
};