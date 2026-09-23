



import { http } from "./api";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  country: string | null;
  currency: string | null;
  brandVoice: string | null;
  brandStyle: string | null;
  targetAge: string | null;
  targetGender: string | null;
  productCount?: number;
  organization: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface BrandInput {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  country?: string;
  currency?: string;
  brandVoice?: string;
  brandStyle?: string;
  targetAge?: string;
  targetGender?: string;
}

export const brandsApi = {
  list: (search?: string) =>
    http.get<{ count: number; brands: Brand[] }>(
      `/api/brands${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  get: (id: string) => http.get<{ brand: Brand }>(`/api/brands/${id}`),

  create: (data: BrandInput) =>
    http.post<{ message: string; brand: Brand }>("/api/brands", data),

  update: (id: string, data: Partial<BrandInput>) =>
    http.patch<{ message: string; brand: Brand }>(`/api/brands/${id}`, data),

  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/brands/${id}`),
};