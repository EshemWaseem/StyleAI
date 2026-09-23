import { http } from "./api";

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  gender: string | null;
  season: string | null;
  occasion: string | null;
  inventory: number | null;
  images: ProductImage[];
  primaryImage: string | null;
  brand?: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category: string;
  sku: string;
  description?: string;
  price: number;
  currency?: string;
  gender?: string;
  season?: string;
  occasion?: string;
  inventory?: number | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  gender: string | null;
  season: string | null;
  occasion: string | null;
  images: { id: string; url: string; position: number }[];
  primaryImage: string | null;
  brand: { id: string; name: string; slug: string; logoUrl: string | null };
}

export interface PublicBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
}

export const PRODUCT_TYPES = [
  "Clothing",
  "Footwear",
  "Accessories",
  "Bags",
  "Outerwear",
  "Jewellery",
  "Beauty",
  "Other",
] as const;

export const GENDER_OPTIONS = ["Women", "Men", "Unisex", "Kids"] as const;
export const SEASON_OPTIONS = [
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
  "All season",
] as const;
export const OCCASION_OPTIONS = [
  "Casual",
  "Work",
  "Evening",
  "Bridal",
  "Travel",
  "Sport",
] as const;
export const CURRENCY_OPTIONS = ["USD", "PKR", "EUR", "GBP", "AED"] as const;

export const MAX_PRODUCT_IMAGES = 5;

export const productsApi = {
  list: (search?: string) =>
    http.get<{ count: number; products: Product[] }>(
      `/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  get: (id: string) => http.get<{ product: Product }>(`/api/products/${id}`),

  create: (data: ProductInput, imageFiles: File[]) => {
    const form = new FormData();
    form.append("name", data.name);
    form.append("category", data.category);
    form.append("sku", data.sku);
    form.append("price", String(data.price));
    if (data.description) form.append("description", data.description);
    if (data.currency) form.append("currency", data.currency);
    if (data.gender) form.append("gender", data.gender);
    if (data.season) form.append("season", data.season);
    if (data.occasion) form.append("occasion", data.occasion);
    if (data.inventory != null) form.append("inventory", String(data.inventory));
    for (const file of imageFiles) form.append("images", file);
    return http.post<{ message: string; product: Product }>("/api/products", form);
  },

  update: (id: string, data: Partial<ProductInput>) =>
    http.patch<{ message: string; product: Product }>(`/api/products/${id}`, data),

  /**
   * Update product with image changes.
   * @param keepImageIds — IDs of existing images to KEEP (others deleted)
   * @param newFiles — new image files to ADD (appended at end)
   */
  updateWithImages: (
    id: string,
    data: Partial<ProductInput>,
    keepImageIds: string[],
    newFiles: File[]
  ) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === "") continue;
      form.append(key, String(value));
    }
    form.append("keepImageIds", JSON.stringify(keepImageIds));
    for (const file of newFiles) form.append("images", file);
    return http.patch<{ message: string; product: Product }>(
      `/api/products/${id}`,
      form
    );
  },

  /**
   * Inventory-only update — restricted to inventory.manage permission.
   * Backend ignores all other fields even if sent.
   */
  updateInventory: (id: string, inventory: number | null) =>
    http.patch<{ message: string; product: Product }>(
      `/api/products/${id}/inventory`,
      { inventory }
    ),

  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/products/${id}`),
};

// ======================================================
// PUBLIC
// ======================================================

const PUBLIC_BASE =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export const publicProductsApi = {
  list: async (
    params: {
      brand?: string;
      category?: string;
      search?: string;
      limit?: number;
    } = {}
  ): Promise<{ count: number; products: PublicProduct[] }> => {
    const qs = new URLSearchParams();
    if (params.brand) qs.set("brand", params.brand);
    if (params.category && params.category !== "All")
      qs.set("category", params.category);
    if (params.search) qs.set("search", params.search);
    if (params.limit) qs.set("limit", String(params.limit));

    const res = await fetch(
      `${PUBLIC_BASE}/api/products/public${qs.toString() ? `?${qs}` : ""}`
    );
    if (!res.ok) throw new Error("Failed to load products");
    return res.json();
  },

  brands: async (): Promise<{ count: number; brands: PublicBrand[] }> => {
    const res = await fetch(`${PUBLIC_BASE}/api/products/public/brands`);
    if (!res.ok) throw new Error("Failed to load brands");
    return res.json();
  },
};