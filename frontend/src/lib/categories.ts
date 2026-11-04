// lib/categories.ts
import type { PublicProduct } from "./products";

export interface CategoryStat {
  name: string;
  slug: string;
  count: number;
  imageUrl?: string; // 👈 NAYA FIELD
}

export interface GenderStat {
  name: string;
  slug: string;
  count: number;
  categories: CategoryStat[];
}

export function slugifyCategoryName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeGender(g: string | null | undefined): string {
  if (!g) return "Unisex";
  const l = g.toLowerCase().trim();
  if (l.includes("women") || l.includes("female") || l === "f") return "Women";
  if (l.includes("men") || l.includes("male") || l === "m") return "Men";
  if (
    l.includes("kid") ||
    l.includes("child") ||
    l.includes("boy") ||
    l.includes("girl")
  )
    return "Kids";
  if (l.includes("unisex") || l === "all") return "Unisex";
  return g.trim();
}

export function deriveCategories(products: PublicProduct[]): {
  genders: GenderStat[];
  categories: CategoryStat[];
} {
  const genderMap = new Map<string, Map<string, { count: number; imageUrl?: string }>>();
  const categoryMap = new Map<string, { count: number; imageUrl?: string }>();

  for (const p of products) {
    const gender = normalizeGender(p.gender);
    const category = (p.category || "Other").trim();
    const img = p.primaryImage || undefined;

    // Gender Map Update
    if (!genderMap.has(gender)) genderMap.set(gender, new Map());
    const gMap = genderMap.get(gender)!;
    const existingG = gMap.get(category) || { count: 0, imageUrl: img };
    gMap.set(category, { 
      count: existingG.count + 1, 
      imageUrl: existingG.imageUrl || img 
    });

    // Category Map Update
    const existingC = categoryMap.get(category) || { count: 0, imageUrl: img };
    categoryMap.set(category, { 
      count: existingC.count + 1, 
      imageUrl: existingC.imageUrl || img 
    });
  }

  const genders: GenderStat[] = Array.from(genderMap.entries())
    .map(([name, cats]) => {
      const categories: CategoryStat[] = Array.from(cats.entries())
        .map(([cName, data]) => ({
          name: cName,
          slug: slugifyCategoryName(cName),
          count: data.count,
          imageUrl: data.imageUrl,
        }))
        .sort((a, b) => b.count - a.count);
      const count = categories.reduce((sum, c) => sum + c.count, 0);
      return { name, slug: slugifyCategoryName(name), count, categories };
    })
    .sort((a, b) => b.count - a.count);

  const categories: CategoryStat[] = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      slug: slugifyCategoryName(name),
      count: data.count,
      imageUrl: data.imageUrl,
    }))
    .sort((a, b) => b.count - a.count);

  return { genders, categories };
}