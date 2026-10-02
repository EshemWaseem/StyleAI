import { http } from "../api";
import type {
  CreateOfferPayload,
  Offer,
  OfferEstimate,
  OfferListResponse,
} from "./types";

export const offersApi = {
  /** Dry-run — nothing saved */
  estimate: (payload: {
    influencerId: string;
    items: Array<{ platform: string; contentType: string; quantity: number; unitPrice: number }>;
  }) => http.post<OfferEstimate>("/api/offers/estimate", payload),

  /** Create DRAFT */
  create: (payload: CreateOfferPayload) =>
    http.post<{ message: string; offer: Offer }>("/api/offers", payload),

  cancel: (id: string, reason?: string) =>
  http.post<{ message: string; offer: Offer }>(`/api/offers/${id}/cancel`, { reason }),

  /** Role-aware list */
  list: (filters: { brandId?: string; influencerId?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<OfferListResponse>(`/api/offers${q ? `?${q}` : ""}`);
  },

  /** Detail */
  get: (offerId: string) =>
    http.get<{ offer: Offer }>(`/api/offers/${offerId}`),

  /** Edit DRAFT */
  update: (offerId: string, payload: Partial<CreateOfferPayload>) =>
    http.patch<{ message: string; offer: Offer }>(`/api/offers/${offerId}`, payload),

  /** DRAFT → PENDING_ADMIN */
  submit: (offerId: string) =>
    http.post<{ message: string; offer: Offer }>(`/api/offers/${offerId}/submit`, {}),

  /** Admin approve/reject */
  adminReview: (offerId: string, payload: { decision: "approve" | "reject"; adminNote?: string }) =>
    http.post<{ message: string; offer: Offer }>(`/api/offers/${offerId}/admin-review`, payload),

  /** Influencer accept/decline */
  influencerReview: (offerId: string, payload: { decision: "accept" | "decline"; influencerNote?: string }) =>
    http.post<{ message: string; offer: Offer }>(`/api/offers/${offerId}/influencer-review`, payload),
};