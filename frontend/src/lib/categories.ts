// lib/categories.ts
import type { PublicProduct } from "./products";

export interface CategoryStat {
  name: string;
  slug: string;
  count: number;
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
  const genderMap = new Map<string, Map<string, number>>();
  const categoryMap = new Map<string, number>();

  for (const p of products) {
    const gender = normalizeGender(p.gender);
    const category = (p.category || "Other").trim();

    if (!genderMap.has(gender)) genderMap.set(gender, new Map());
    const gMap = genderMap.get(gender)!;
    gMap.set(category, (gMap.get(category) || 0) + 1);

    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  }

  const genders: GenderStat[] = Array.from(genderMap.entries())
    .map(([name, cats]) => {
      const categories: CategoryStat[] = Array.from(cats.entries())
        .map(([cName, count]) => ({
          name: cName,
          slug: slugifyCategoryName(cName),
          count,
        }))
        .sort((a, b) => b.count - a.count);
      const count = categories.reduce((sum, c) => sum + c.count, 0);
      return { name, slug: slugifyCategoryName(name), count, categories };
    })
    .sort((a, b) => b.count - a.count);

  const categories: CategoryStat[] = Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      slug: slugifyCategoryName(name),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return { genders, categories };
}