// components/shop/category-grid.tsx
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Baby, Footprints, Gem, Layers, Package, Shirt, ShoppingBag, Sparkles,
  UserRound, Users, Watch,
} from "lucide-react";
import type { CategoryStat, GenderStat } from "@/lib/categories";

export { slugifyCategoryName as slugifyCategory } from "@/lib/categories";

const CATEGORY_ICONS: Record<string, typeof Shirt> = {
  Clothing: Shirt,
  Footwear: Footprints,
  Accessories: Watch,
  Bags: ShoppingBag,
  Outerwear: Layers,
  Jewellery: Gem,
  Makeup: Sparkles,
  Beauty: Sparkles,
};

const GENDER_ICONS: Record<string, typeof UserRound> = {
  Women: UserRound,
  Men: UserRound,
  Kids: Baby,
  Unisex: Users,
};

function CategoryImage({ imageUrl, name, Icon }: { imageUrl?: string, name: string, Icon: any }) {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-gradient-to-br from-accent/10 to-accent/5 p-1 text-accent/60">
        <Icon className="size-5 mb-1 opacity-70" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{name.slice(0, 3)}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      onError={() => setHasError(true)}
      className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
      loading="lazy"
    />
  );
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
    <section className="border-t border-border bg-background">
      {/* 👇 APPLIED UNIFORM ALIGNMENT CONTAINER HERE */}
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        
        {hasGenders && (
          <div className="mb-10">
            <h2 className="mb-4 font-display text-xl font-medium tracking-tight">Shop for</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {genders.map((g) => {
                const Icon = GENDER_ICONS[g.name] ?? Package;
                return (
                  <Link
                    key={g.slug}
                    to="/shop/gender/$slug"
                    params={{ slug: g.slug }}
                    className="group flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-accent/50 hover:bg-accent/5 hover:shadow-sm"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-accent/10 text-accent">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.count} items</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {hasCategories && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                Categories
              </h2>
              <Link to="/shop" className="text-xs font-medium text-accent hover:underline">
                View All &rarr;
              </Link>
            </div>
            
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {categories.map((c) => {
                const Icon = CATEGORY_ICONS[c.name] ?? Package;
                
                return (
                  <Link
                    key={c.slug}
                    to="/shop/category/$slug"
                    params={{ slug: c.slug }}
                    className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-2.5 transition-all hover:border-accent/40 hover:shadow-md"
                  >
                    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted/20 border border-border/50">
                      <CategoryImage 
                        imageUrl={c.imageUrl} 
                        name={c.name} 
                        Icon={Icon} 
                      />
                    </div>
                    
                    <div className="w-full text-center">
                      <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground sm:text-xs group-hover:text-accent transition-colors">
                        {c.name}
                      </p>
                      <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                        {c.count} item{c.count === 1 ? "" : "s"}
                      </p>
                    </div>
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