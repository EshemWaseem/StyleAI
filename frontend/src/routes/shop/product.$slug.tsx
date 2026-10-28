// frontend/src/routes/shop/product.$slug.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, Loader2,
  Minus, Plus, Sparkles,
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
  head: () => ({
    meta: [
      { title: "Product — StyleAI" },
      { name: "description", content: "Discover this piece on StyleAI." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPublicPage,
});

function ProductPublicPage() {
  const { slug: productId } = Route.useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [related, setRelated] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    publicProductsApi
      .get(productId)
      .then((res) => {
        if (cancelled) return;
        setProduct(res.product);
        if (res.product.category) {
          publicProductsApi
            .list({ category: res.product.category, limit: 12 })
            .then((r) => {
              if (cancelled) return;
              setRelated(
                r.products
                  .filter((p) => p.id !== res.product.id)
                  .slice(0, 4)
              );
            })
            .catch(() => {});
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || "Could not load product.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Inline SEO injection
  useEffect(() => {
    if (!product) return;
    const productUrl = `${SEO.siteUrl}/shop/product/${product.id}`;
    const description =
      product.description ||
      `${product.name} from ${product.brand.name} on StyleAI.`;

    document.title = `${product.name} — ${product.brand.name} · StyleAI`;

    const setMeta = (selector: string, attr: "name" | "property", value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, selector.match(/"([^"]+)"/)?.[1] || "");
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    setMeta('meta[property="og:title"]', "property", product.name);
    setMeta('meta[property="og:description"]', "property", description);
    setMeta('meta[property="og:url"]', "property", productUrl);
    if (product.primaryImage) {
      setMeta('meta[property="og:image"]', "property", product.primaryImage);
    }
    setMeta('meta[name="twitter:title"]', "name", product.name);
    setMeta('meta[name="twitter:description"]', "name", description);
    setMeta('meta[name="description"]', "name", description);

    const jsonLd = SEO.product({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      category: product.category,
      price: product.price,
      currency: product.currency,
      primaryImage: product.primaryImage,
      brand: product.brand,
    });
    let script = document.getElementById("product-jsonld");
    if (script) script.remove();
    script = document.createElement("script");
    script.id = "product-jsonld";
    (script as HTMLScriptElement).type = "application/ld+json";
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.getElementById("product-jsonld")?.remove();
    };
  }, [product]);

  function addToCart(goToCheckout = false) {
    if (!product) return;
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

  if (loading) {
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

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader cartCount={cart.count} />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error || "Product not found"}</span>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader cartCount={cart.count} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
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
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Category</dt>
                  <dd className="mt-1 font-medium">{product.category}</dd>
                </div>
              )}
              {product.gender && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Gender</dt>
                  <dd className="mt-1 font-medium">{product.gender}</dd>
                </div>
              )}
              {product.season && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Season</dt>
                  <dd className="mt-1 font-medium">{product.season}</dd>
                </div>
              )}
              {product.occasion && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Occasion</dt>
                  <dd className="mt-1 font-medium">{product.occasion}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8 space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">Qty</span>
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
                  <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
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
                Free shipping on orders above $100 · Shipping and taxes calculated at checkout.
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-card/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sold by
              </p>
              <p className="mt-1 font-display text-base font-medium">{product.brand.name}</p>
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