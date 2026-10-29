// frontend/src/routes/shop/product.$slug.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import { ProductCard } from "@/components/shop/product-card";
import { PublicHeader } from "@/components/shop/public-header";
import { slugifyCategory } from "@/components/shop/category-grid";
import { useCart } from "@/lib/cart";
import { publicProductsApi, type PublicProduct } from "@/lib/products";
import { SEO } from "@/lib/seo";

export const Route = createFileRoute("/shop/product/$slug")({
  loader: async ({ params }) => {
    try {
      const res = await publicProductsApi.get(params.slug);
      const product = res.product;
      let related: PublicProduct[] = [];
      if (product.category) {
        try {
          const r = await publicProductsApi.list({
            category: product.category,
            limit: 12,
          });
          related = r.products
            .filter((p) => p.id !== product.id)
            .slice(0, 4);
        } catch {
          // related fetch failures are non-critical
        }
      }
      return { product, related };
    } catch (e: any) {
      throw new Error(e?.message || "Product not found");
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.product) {
      return {
        meta: [
          { title: "Product — StyleAI" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    const p = loaderData.product;
    const productUrl = `${SEO.siteUrl}/shop/product/${p.id}`;
    const description =
      p.description || `${p.name} from ${p.brand.name} on StyleAI.`;
    const categorySlug = p.category ? slugifyCategory(p.category) : null;
    const categoryPath = categorySlug
      ? `/shop/category/${categorySlug}`
      : null;

    const breadcrumbs = [
      { name: "Home", path: "/" },
      { name: "Shop", path: "/shop" },
      ...(p.category && categoryPath
        ? [{ name: p.category, path: categoryPath }]
        : []),
      { name: p.name, path: `/shop/product/${p.id}` },
    ];

    return {
      meta: [
        { title: `${p.name} — ${p.brand.name} · StyleAI` },
        { name: "description", content: description },
        { property: "og:title", content: `${p.name} — ${p.brand.name}` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: productUrl },
        ...(p.primaryImage
          ? [{ property: "og:image", content: p.primaryImage }]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${p.name} — ${p.brand.name}` },
        { name: "twitter:description", content: description },
        ...(p.primaryImage
          ? [{ name: "twitter:image", content: p.primaryImage }]
          : []),
      ],
      links: [{ rel: "canonical", href: productUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(SEO.product(p)),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(SEO.breadcrumb(breadcrumbs)),
        },
      ],
    };
  },
  component: ProductPublicPage,
  pendingComponent: ProductLoading,
  errorComponent: ProductError,
});

function ProductLoading() {
  const cart = useCart();
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader cartCount={cart.count} />
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-24">
        <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading product…</span>
      </div>
    </div>
  );
}

function ProductError({ error }: { error: Error }) {
  const cart = useCart();
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader cartCount={cart.count} />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error?.message || "Product not found"}</span>
        </div>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/shop">
            <ArrowLeft /> Back to shop
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ProductPublicPage() {
  const { product, related } = Route.useLoaderData();
  const navigate = useNavigate();
  const cart = useCart();

  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  function addToCart(goToCheckout = false) {
    for (let i = 0; i < qty; i++) {
      cart.add({
        slug: product.id,
        name: product.name,
        price: product.price ?? 0,
        image: product.primaryImage ?? "",
        category: product.category ?? "",
      });
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
    if (goToCheckout) navigate({ to: "/checkout" });
  }

  function addRelatedToCart(p: PublicProduct) {
    cart.add({
      slug: p.id,
      name: p.name,
      price: p.price ?? 0,
      image: p.primaryImage ?? "",
      category: p.category ?? "",
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader cartCount={cart.count} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">
            Shop
          </Link>
          {product.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link
                to="/shop/category/$slug"
                params={{ slug: slugifyCategory(product.category) }}
                className="hover:text-foreground"
              >
                {product.category}
              </Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <ProductImageSlider
              images={product.images ?? []}
              alt={product.name}
              aspect="aspect-[3/4]"
              size="lg"
              showThumbnails
              showDots
              showCounter
            />
          </div>

          <div className="min-w-0">
            <Link
              to="/shop/category/$slug"
              params={{ slug: slugifyCategory(product.category ?? "All") }}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent hover:underline"
            >
              <Sparkles className="size-3" />
              {product.brand.name}
            </Link>
            <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            <p className="mt-3 text-2xl font-medium tabular-nums">
              {product.currency} {product.price?.toFixed(2)}
            </p>

            {product.description && (
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                {product.description}
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
              {product.category && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Category
                  </dt>
                  <dd className="mt-1 font-medium">{product.category}</dd>
                </div>
              )}
              {product.gender && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Gender
                  </dt>
                  <dd className="mt-1 font-medium">{product.gender}</dd>
                </div>
              )}
              {product.season && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Season
                  </dt>
                  <dd className="mt-1 font-medium">{product.season}</dd>
                </div>
              )}
              {product.occasion && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Occasion
                  </dt>
                  <dd className="mt-1 font-medium">{product.occasion}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8 space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Qty
                </span>
                <div className="flex items-center gap-2 rounded-md border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid size-9 place-items-center hover:bg-accent/10 disabled:opacity-50"
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    className="grid size-9 place-items-center hover:bg-accent/10 disabled:opacity-50"
                    disabled={qty >= 10}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  variant={justAdded ? "secondary" : "default"}
                  onClick={() => addToCart(false)}
                  className="flex-1"
                >
                  {justAdded ? (
                    <>
                      <Check className="size-4" /> Added to bag
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Add to bag
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => addToCart(true)}
                  className="flex-1"
                >
                  Buy now <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
              <p className="text-center text-[11px] text-muted-foreground sm:text-left">
                Free shipping on orders above $100 · Shipping and taxes
                calculated at checkout.
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-card/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sold by
              </p>
              <p className="mt-1 font-display text-base font-medium">
                {product.brand.name}
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  More from {product.category}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You might also like these pieces.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/shop/category/$slug"
                  params={{ slug: slugifyCategory(product.category ?? "All") }}
                >
                  View category <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  added={false}
                  onAdd={addRelatedToCart}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}