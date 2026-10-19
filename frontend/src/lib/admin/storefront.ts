// frontend/src/lib/admin/storefront.ts
import { http } from "../api";

export type StorefrontSectionType = "MANUAL" | "AUTO";
export type StorefrontLayout = "GRID" | "CAROUSEL";
export type StorefrontOptIn = "NOT_REQUESTED" | "REQUESTED" | "APPROVED" | "DECLINED";
export type ProductPlacement = "ECOM" | "TRENDING" | "HERO";

export interface StorefrontApplication {
  products: Array<{ id: string; placement: ProductPlacement }>;
  notes: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  headline: string | null;
  subheading: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Editorial {
  id: string;
  title: string;
  steps: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionSummary {
  id: string;
  title: string;
  subtitle: string | null;
  type: StorefrontSectionType;
  layout: StorefrontLayout;
  rule: string | null;
  productLimit: number;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDetail extends SectionSummary {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    price: number | null;
    currency: string | null;
    category: string | null;
    storefrontVisible: boolean;
    brand: { id: string; name: string; slug: string };
    primaryImage: string | null;
    sortOrder: number;
    linkId: string;
  }>;
}

export interface StorefrontBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  storefrontStatus: StorefrontOptIn;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  declineReason: string | null;
  application: StorefrontApplication | null;
  organization: { id: string; name: string; slug: string };
  productCount: number;
}

export interface PickerProduct {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  price: number | null;
  currency: string | null;
  storefrontVisible: boolean;
  brand: { id: string; name: string; slug: string };
  primaryImage: string | null;
}

export const adminStorefrontApi = {
  // HERO
  listHero: () => http.get<{ hero: HeroSlide[] }>("/api/admin/storefront/hero"),
  createHero: (data: Partial<HeroSlide>) =>
    http.post<{ message: string; hero: HeroSlide }>("/api/admin/storefront/hero", data),
  updateHero: (id: string, data: Partial<HeroSlide>) =>
    http.patch<{ message: string; hero: HeroSlide }>(`/api/admin/storefront/hero/${id}`, data),
  deleteHero: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/admin/storefront/hero/${id}`),

  // SECTIONS
  listSections: () =>
    http.get<{ sections: SectionSummary[] }>("/api/admin/storefront/sections"),
  getSection: (id: string) =>
    http.get<{ section: SectionDetail }>(`/api/admin/storefront/sections/${id}`),
  createSection: (data: Partial<SectionSummary>) =>
    http.post<{ message: string; section: SectionSummary }>("/api/admin/storefront/sections", data),
  updateSection: (id: string, data: Partial<SectionSummary>) =>
    http.patch<{ message: string; section: SectionSummary }>(`/api/admin/storefront/sections/${id}`, data),
  deleteSection: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/admin/storefront/sections/${id}`),
  setSectionProducts: (id: string, productIds: string[]) =>
    http.put<{ message: string; count: number }>(
      `/api/admin/storefront/sections/${id}/products`,
      { productIds }
    ),

  // BRAND APPLICATIONS
  listBrands: (filters: { search?: string; status?: StorefrontOptIn } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ brands: StorefrontBrand[] }>(
      `/api/admin/storefront/brands${q ? `?${q}` : ""}`
    );
  },
  reviewBrand: (brandId: string, approve: boolean, reason?: string) =>
    http.patch<{ message: string; brand: any }>(
      `/api/admin/storefront/brands/${brandId}/review`,
      { approve, reason }
    ),
  revokeBrand: (brandId: string, reason?: string) =>
    http.post<{ message: string; id: string }>(
      `/api/admin/storefront/brands/${brandId}/revoke`,
      { reason }
    ),

  // PRODUCT PICKER
  searchProducts: (search?: string) => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    const q = qs.toString();
    return http.get<{ products: PickerProduct[] }>(
      `/api/admin/storefront/products${q ? `?${q}` : ""}`
    );
  },

  // EDITORIAL
  getEditorial: () =>
    http.get<{ editorial: Editorial | null }>("/api/admin/storefront/editorial"),
  upsertEditorial: (data: { title: string; steps: string[]; isActive?: boolean }) =>
    http.put<{ message: string; editorial: Editorial }>(
      "/api/admin/storefront/editorial",
      data
    ),
  deleteEditorial: () =>
    http.delete<{ message: string; id: string | null }>("/api/admin/storefront/editorial"),
};