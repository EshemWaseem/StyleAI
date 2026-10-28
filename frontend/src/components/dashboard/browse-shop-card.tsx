// components/dashboard/browse-shop-card.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Package, Shirt, ShoppingBag, Sparkles } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui-kit";
import { publicProductsApi } from "@/lib/products";
import { deriveCategories, type CategoryStat } from "@/lib/categories";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Shirt> = {
  Clothing: Shirt,
  Bags: ShoppingBag,
  Footwear: Package,
  Makeup: Sparkles,
  Beauty: Sparkles,
};

export function BrowseShopCard() {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicProductsApi
      .list({ limit: 200 })
      .then((r) => {
        const derived = deriveCategories(r.products);
        setCategories(derived.categories.slice(0, 6));
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Panel className="mt-6">
        <SectionTitle
          title="Browse the shop"
          description="Explore the public collection."
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </Panel>
    );
  }

  if (categories.length === 0) return null;

  return (
    <Panel className="mt-6">
      <SectionTitle
        title="Browse the shop"
        description="See how your catalog appears to shoppers — explore the live collection."
        action={
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => {
          const Icon = ICONS[c.name] ?? Package;
          return (
            <Link
              key={c.slug}
              to="/shop/category/$slug"
              params={{ slug: c.slug }}
              className={cn(
                "group flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-center transition-all hover:border-border/80 hover:shadow-lift"
              )}
            >
              <span className="grid size-10 place-items-center rounded-md bg-accent/10 text-accent">
                <Icon className="size-5" />
              </span>
              <p className="truncate text-xs font-medium">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {c.count} item{c.count === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}