import { http } from "./api";

export interface AIProductAttributes {
  target_gender: string;
  category: string | null;
  product_type: string | null;
  color: string | null;
  secondary_colors: string[];
  pattern: string | null;
  material: string | null;
  style: string | null;
  attributes: Record<string, any>;
  confidence: number;
  uncertain_fields: string[];
}

export interface AIContent {
  product_name: string;
  short_description: string;
  description: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  suggested_price: number | null;
  price_currency: string | null;
  price_confidence: number | null;
  price_reasoning: string | null;
}

export interface AIResult {
  attributes: AIProductAttributes;
  content: AIContent;
  sku: string | null;
}

export const aiApi = {
   async analyzeAndGenerate(
    file: File,
    opts?: { brand_name?: string; brand_voice?: string; currency?: string }
  ): Promise<AIResult> {
    const form = new FormData();
    form.append("image", file);
    if (opts?.brand_name) form.append("brand_name", opts.brand_name);
    if (opts?.brand_voice) form.append("brand_voice", opts.brand_voice);
    if (opts?.currency) form.append("currency", opts.currency);

    const res = await http.post<{ success: boolean; data: AIResult }>(
      "/api/ai/product/analyze-and-generate",
      form
    );
    return res.data;
  },

  async generateAngles(
    file: File,
    keys: string[] = []
  ): Promise<{ variants: AngleVariant[]; meta: AngleGenerationMeta }> {
    const form = new FormData();
    form.append("image", file);
    if (keys.length > 0) form.append("keys", keys.join(","));

    const res = await http.post<{
      success: boolean;
      data: { variants: AngleVariant[]; meta: AngleGenerationMeta };
    }>("/api/ai/product/angles", form);

    return res.data;
  },
  async generatePlatformContent(
    payload: PlatformContentRequest
  ): Promise<PlatformContentResponse> {
    const res = await http.post<{
      success: boolean;
      data: PlatformContentResponse;
    }>("/api/ai/content/platform", payload);
    return res.data;
  },
   async generatePhotography(
    file: File,
    fields: PhotographyRequestFields
  ): Promise<PhotographyResult> {
    const form = new FormData();
    form.append("image", file);
    form.append("scene", fields.scene);
    if (fields.lighting) form.append("lighting", fields.lighting);
    if (fields.include_model !== undefined)
      form.append("include_model", String(fields.include_model));
    if (fields.aspect_ratio) form.append("aspect_ratio", fields.aspect_ratio);
    if (fields.extra_notes) form.append("extra_notes", fields.extra_notes);

    const res = await http.post<{ success: boolean; data: PhotographyResult }>(
      "/api/ai/product/photography",
      form
    );
    return res.data;
  },
};



// ======================================================
// AI PRODUCT ANGLES
// ======================================================
export interface AngleVariant {
  key: string;
  label: string;
  url: string;       // Cloudinary URL after Node upload
  publicId: string;
  width: number;
  height: number;
}

export interface AngleGenerationMeta {
  provider: string;
  model: string;
  latency_ms: number;
  count: number;
  preserved_features: string[];
  fallback_used: boolean;
}


// ======================================================
// PLATFORM CONTENT
// ======================================================
export type Platform = "instagram" | "tiktok" | "youtube" | "blog";

export interface PlatformContentRequest {
  platform: Platform;
  productId?: string;
  product_name?: string;
  category?: string;
  description?: string;
  color?: string;
  material?: string;
  price?: number;
  currency?: string;
  brand_name?: string;
  brand_voice?: string;
  tone?: string;
  extra_notes?: string;
}

export interface PlatformContentResponse {
  platform: Platform;
  content: Record<string, any>;
  provider: string;
  model: string;
  latency_ms: number;
  retried: boolean;
}

// Add to aiApi object — see step 9b below



// ======================================================
// AI PHOTOGRAPHY
// ======================================================
export type SceneMode =
  | "studio" | "luxury" | "lifestyle" | "outdoor" | "street"
  | "minimal" | "editorial" | "ecommerce" | "social";

export interface QACheck {
  label: string;
  value: number;
}

export interface QualityReport {
  passed: boolean;
  overall: number;
  checks: QACheck[];
  feedback: string;
}

export interface PhotographyResult {
  scene: string;
  provider: string;
  model: string;
  latency_ms: number;
  regenerated: boolean;
  quality: QualityReport;
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
  };
}

export interface PhotographyRequestFields {
  scene: SceneMode;
  lighting?: string;
  include_model?: boolean;
  aspect_ratio?: string;
  extra_notes?: string;
}