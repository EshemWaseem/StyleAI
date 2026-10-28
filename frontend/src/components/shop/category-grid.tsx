// components/shop/category-grid.tsx
import { Link } from "@tanstack/react-router";
import {
  Baby, Footprints, Gem, Layers, Package, Shirt, ShoppingBag, Sparkles,
  UserRound, Users, Watch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryStat, GenderStat } from "@/lib/categories";

// Backward-compatible helper still used elsewhere
export { slugifyCategoryName as slugifyCategory } from "@/lib/categories";

const CATEGORY_ICONS: Record<string, { icon: typeof Shirt; tone: string }> = {
  Clothing:    { icon: Shirt,       tone: "from-rose-500/10 to-rose-500/5 text-rose-500" },
  Footwear:    { icon: Footprints,  tone: "from-blue-500/10 to-blue-500/5 text-blue-500" },
  Accessories: { icon: Watch,       tone: "from-amber-500/10 to-amber-500/5 text-amber-500" },
  Bags:        { icon: ShoppingBag, tone: "from-purple-500/10 to-purple-500/5 text-purple-500" },
  Outerwear:   { icon: Layers,      tone: "from-emerald-500/10 to-emerald-500/5 text-emerald-500" },
  Jewellery:   { icon: Gem,         tone: "from-pink-500/10 to-pink-500/5 text-pink-500" },
  Makeup:      { icon: Sparkles,    tone: "from-fuchsia-500/10 to-fuchsia-500/5 text-fuchsia-500" },
  Beauty:      { icon: Sparkles,    tone: "from-violet-500/10 to-violet-500/5 text-violet-500" },
};

const GENDER_ICONS: Record<string, { icon: typeof UserRound; tone: string }> = {
  Women:  { icon: UserRound, tone: "from-rose-500/10 to-rose-500/5 text-rose-500" },
  Men:    { icon: UserRound, tone: "from-blue-500/10 to-blue-500/5 text-blue-500" },
  Kids:   { icon: Baby,      tone: "from-amber-500/10 to-amber-500/5 text-amber-500" },
  Unisex: { icon: Users,     tone: "from-slate-500/10 to-slate-500/5 text-slate-500" },
};

function fallbackIcon() {
  return {
    icon: Package,
    tone: "from-muted to-muted/50 text-muted-foreground",
  };
}

export function CategoryGrid({
  genders,
  categories,
}: {
  genders: GenderStat[];
  categories: CategoryStat[];
}) {
  const hasGenders = genders.length > 0;
  const hasCategories = categories.length > 0;

  if (!hasGenders && !hasCategories) return null;

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Browse
          </p>
          <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            Shop by category
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            From tailored outerwear to signature bags — find exactly what you're looking for.
          </p>
        </div>

        {hasGenders && (
          <div className="mb-8">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Shop for
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {genders.map((g) => {
                const meta = GENDER_ICONS[g.name] ?? fallbackIcon();
                const Icon = meta.icon;
                return (
                  <Link
                    key={g.slug}
                    to="/shop/gender/$slug"
                    params={{ slug: g.slug }}
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:shadow-lift sm:p-5"
                  >
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br",
                        meta.tone
                      )}
                    >
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {g.count} item{g.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {hasCategories && (
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Explore categories
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
              {categories.slice(0, 12).map((c) => {
                const meta = CATEGORY_ICONS[c.name] ?? fallbackIcon();
                const Icon = meta.icon;
                return (
                  <Link
                    key={c.slug}
                    to="/shop/category/$slug"
                    params={{ slug: c.slug }}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-border/80 hover:shadow-lift sm:p-5"
                  >
                    <span
                      className={cn(
                        "grid size-12 place-items-center rounded-lg bg-gradient-to-br",
                        meta.tone
                      )}
                    >
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.count} item{c.count === 1 ? "" : "s"}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}