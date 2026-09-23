// 23-9-26 
// 2:09

import { http } from "../api";
import type {
  Influencer,
  InfluencerFilters,
  InfluencerInput,
} from "./types";

export const influencersApi = {
  list: (filters: InfluencerFilters = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{
      count: number;
      total: number;
      influencers: Influencer[];
    }>(`/api/influencers${q ? `?${q}` : ""}`);
  },

  get: (idOrSlug: string) =>
    http.get<{ influencer: Influencer }>(`/api/influencers/${idOrSlug}`),

  getMe: () =>
    http.get<{ influencer: Influencer }>("/api/influencers/me"),

  create: (data: InfluencerInput) =>
    http.post<{ message: string; influencer: Influencer }>(
      "/api/influencers",
      data
    ),

  update: (id: string, data: Partial<InfluencerInput>) =>
    http.patch<{ message: string; influencer: Influencer }>(
      `/api/influencers/${id}`,
      data
    ),

  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/influencers/${id}`),

  save: (id: string) =>
    http.post<{ saved: boolean; influencerId: string }>(
      `/api/influencers/${id}/save`,
      {}
    ),

//   unsave: (id: string) =>
//     http.delete<{ saved: boolean; influencerId: string }>(
//       `/api/influencers/${id}/save`
//     ),
// };


 unsave: (id: string) =>
    http.delete<{ saved: boolean; influencerId: string }>(
      `/api/influencers/${id}/save`
    ),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return http.post<{ url: string; publicId: string }>(
      "/api/influencers/upload-avatar",
      form
    );
  },
};