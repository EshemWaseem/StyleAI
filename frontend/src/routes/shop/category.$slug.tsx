// routes/shop/category.$slug.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/shop/product-card";
import { PublicHeader } from "@/components/shop/public-header";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { slugifyCategory } from "@/components/shop/category-grid";
import {
  publicProductsApi,
  PRODUCT_TYPES,
  type PublicProduct,
} from "@/lib/products";
import { SEO } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/category/$slug")({
  head: ({ params }) => {
    const name =
      PRODUCT_TYPES.find((c) => slugifyCategory(c) === params.slug) ??
      params.slug;
    const title = `${name} — StyleAI`;
    const description = `Browse ${name} on StyleAI — AI-styled fashion pieces from approved brands.`;
    const path = `/shop/category/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: SEO.siteUrl + path },
        { property: "og:image", content: SEO.siteUrl + "/og-default.jpg" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: SEO.siteUrl + path }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(SEO.collection(name, path, description)),
        },
      ],
    };
  },
  component: CategoryPage,
});

const SHOP_CATEGORIES = ["All", ...PRODUCT_TYPES.filter((c) => c !== "Other")];

function CategoryPage() {
  const { slug } = Route.useParams();
  const matchedCategory =
    PRODUCT_TYPES.find((c) => slugifyCategory(c) === slug) ?? null;

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(matchedCategory ?? "All");
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cart = useCart();

  useEffect(() => {
    setFilter(matchedCategory ?? "All");
  }, [slug, matchedCategory]);

  useEffect(() => {
    setLoading(true);
    publicProductsApi
      .list({
        category: filter !== "All" ? filter : undefined,
        search: query.trim() || undefined,
      })
      .then((r) => setProducts(r.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [filter, query]);

  function addToCart(p: PublicProduct) {
    cart.add({
      slug: p.id,
      name: p.name,
      price: p.price ?? 0,
      image: p.primaryImage ?? "",
      category: p.category ?? "",
    });
    setJustAdded(p.id);
    setTimeout(() => setJustAdded((s) => (s === p.id ? null : s)), 1400);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader cartCount={cart.count} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All products
        </Link>

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Category
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {matchedCategory ?? slug}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? "Loading collection…"
              : `${products.length} piece${products.length === 1 ? "" : "s"} in ${filter === "All" ? "all categories" : filter}`}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search this category"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {SHOP_CATEGORIES.map((c) => {
            const isActive = filter === c;
            const hrefSlug = c === "All" ? "" : slugifyCategory(c);
            return (
              <Link
                key={c}
                to={c === "All" ? "/shop" : "/shop/category/$slug"}
                params={c === "All" ? undefined : { slug: hrefSlug }}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-accent bg-accent text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {c}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-sm font-medium">No pieces in this category yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check back soon, or browse the full collection.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/shop">
                  Browse all <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  added={justAdded === p.id}
                  onAdd={addToCart}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}