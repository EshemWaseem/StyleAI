// lib/recommendations/api.ts
import { http } from "../api";
import type { RecommendationsResponse } from "./types";

export const recommendationsApi = {
  list: () => http.get<RecommendationsResponse>("/api/recommendations"),
};