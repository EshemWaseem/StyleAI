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
};


// import { http } from "./api";

// export interface AIProductAttributes {
//   target_gender: string;
//   category: string | null;
//   product_type: string | null;
//   color: string | null;
//   secondary_colors: string[];
//   pattern: string | null;
//   material: string | null;
//   style: string | null;
//   attributes: Record<string, any>;
//   confidence: number;
//   uncertain_fields: string[];
// }

// export interface AIContent {
//   product_name: string;
//   short_description: string;
//   description: string;
//   tags: string[];
//   seo_title: string;
//   seo_description: string;
//   suggested_price: number | null;
//   price_currency: string | null;
//   price_confidence: number | null;
//   price_reasoning: string | null;
// }

// export interface AIResult {
//   attributes: AIProductAttributes;
//   content: AIContent;
//   sku: string | null;
// }

// export const aiApi = {
//   async analyzeAndGenerate(
//     file: File,
//     opts?: { brand_name?: string; brand_voice?: string; currency?: string }
//   ): Promise<AIResult> {
//     const form = new FormData();
//     form.append("image", file);
//     if (opts?.brand_name) form.append("brand_name", opts.brand_name);
//     if (opts?.brand_voice) form.append("brand_voice", opts.brand_voice);
//     if (opts?.currency) form.append("currency", opts.currency); // ★ NEW

//     const res = await http.post<{ success: boolean; data: AIResult }>(
//       "/api/ai/product/analyze-and-generate",
//       form
//     );
//     return res.data;
//   },
// };

