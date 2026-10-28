// frontend/src/components/shop/product-card.tsx
import { Link } from "@tanstack/react-router";
import { Check, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "@/lib/products";

export function ProductCard({
  p,
  added,
  onAdd,
  compact,
}: {
  p: PublicProduct;
  added: boolean;
  onAdd: (p: PublicProduct) => void;
  compact?: boolean;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift">
      <Link
        to="/shop/product/$slug"
        params={{ slug: p.id }}
        className="relative block"
        aria-label={`View ${p.name}`}
      >
        <ProductImageSlider
          images={p.images ?? []}
          alt={p.name}
          aspect="aspect-[3/4]"
          size="sm"
          showDots={false}
          showCounter={(p.images ?? []).length > 1}
          rounded="rounded-none"
        />
        <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-accent sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
          <Sparkles className="size-3" aria-hidden="true" /> {p.brand.name}
        </span>
      </Link>

      <div className={cn("space-y-2.5 p-3 sm:space-y-3 sm:p-5", compact && "sm:p-3")}>
        <div>
          <Link to="/shop/product/$slug" params={{ slug: p.id }}>
            <h3
              className={cn(
                "font-display font-medium leading-snug hover:underline",
                compact ? "text-sm sm:text-base" : "text-sm sm:text-lg"
              )}
            >
              {p.name}
            </h3>
          </Link>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
            {p.category ?? "Uncategorised"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium tabular-nums sm:text-base">
            {p.currency} {p.price?.toFixed(2)}
          </span>
          <Button
            size="sm"
            variant={added ? "secondary" : "default"}
            onClick={() => onAdd(p)}
            className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
          >
            {added ? (
              <>
                <Check className="size-3.5" /> Added
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}