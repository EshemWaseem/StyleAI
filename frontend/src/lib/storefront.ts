// frontend/src/lib/storefront.ts
import { http } from "./api";

export type StorefrontOptIn =
  | "NOT_REQUESTED"
  | "REQUESTED"
  | "APPROVED"
  | "DECLINED";

export type ProductPlacement = "ECOM" | "TRENDING" | "HERO";

export interface StorefrontApplicationPayload {
  products: Array<{ id: string; placement: ProductPlacement }>;
  notes?: string;
}

export interface StorefrontApplication {
  products: Array<{ id: string; placement: ProductPlacement }>;
  notes: string;
}

export interface MyStorefrontStatus {
  brandId: string;
  brandName: string;
  status: StorefrontOptIn;
  appliedAt: string | null;
  reviewedAt: string | null;
  declineReason: string | null;
  productCount: number;
  visibleProductCount: number;
  application: StorefrontApplication | null;
}

export const brandStorefrontApi = {
  getMyStatus: () =>
    http.get<{ status: MyStorefrontStatus }>("/api/storefront/me/status"),

  apply: (payload: StorefrontApplicationPayload) =>
    http.post<{ message: string; status: MyStorefrontStatus }>(
      "/api/storefront/me/apply",
      payload
    ),

  withdraw: () =>
    http.post<{ message: string; status: MyStorefrontStatus }>(
      "/api/storefront/me/withdraw",
      {}
    ),

  toggleProductVisibility: (productId: string, visible: boolean) =>
    http.patch<{
      message: string;
      product: { id: string; name: string; storefrontVisible: boolean };
    }>(`/api/storefront/me/products/${productId}/visibility`, { visible }),
};