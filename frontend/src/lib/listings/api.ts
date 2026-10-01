import { http } from "../api";
import type { Listing, ListingListResponse, CreateListingPayload } from "./types";

export const listingsApi = {
  list: (filters: { status?: string; search?: string; all?: boolean; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<ListingListResponse>(`/api/listings${q ? `?${q}` : ""}`);
  },
  get: (id: string) => http.get<{ listing: Listing }>(`/api/listings/${id}`),
  create: (payload: CreateListingPayload) =>
    http.post<{ message: string; listing: Listing }>("/api/listings", payload),
  cancel: (id: string) =>
    http.post<{ message: string; listing: Listing }>(`/api/listings/${id}/cancel`, {}),
  claim: (id: string, payload: { brandId: string }) =>
    http.post<{ message: string; listing: Listing; offerId: string }>(
      `/api/listings/${id}/claim`, payload
    ),
};