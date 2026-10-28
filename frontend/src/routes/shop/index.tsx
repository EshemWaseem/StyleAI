// routes/shop/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/shop/product-card";
import { PublicHeader } from "@/components/shop/public-header";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { publicProductsApi, type PublicProduct } from "@/lib/products";
import { deriveCategories } from "@/lib/categories";
import { SEO } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Shop all products — StyleAI" },
      { name: "description", content: "Browse the full StyleAI collection — clothing, footwear, bags, accessories and more." },
      { property: "og:title", content: "Shop all products — StyleAI" },
      { property: "og:description", content: "Browse the full StyleAI collection." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SEO.siteUrl + "/shop" },
      { property: "og:image", content: SEO.siteUrl + "/og-default.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SEO.siteUrl + "/shop" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(SEO.collection("All products", "/shop")),
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const [allProducts, setAllProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cart = useCart();

  useEffect(() => {
    setLoading(true);
    publicProductsApi
      .list({ limit: 500 })
      .then((r) => setAllProducts(r.products))
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const { genders, categories } = useMemo(
    () => deriveCategories(allProducts),
    [allProducts]
  );

  const products = useMemo(() => {
    let list = allProducts;
    if (genderFilter !== "All") {
      const gf = genderFilter.toLowerCase();
      list = list.filter((p) => {
        const g = (p.gender || "unisex").toLowerCase();
        if (gf === "women")
          return g.includes("women") || g.includes("female") || g === "f";
        if (gf === "men")
          return (
            (g.includes("men") && !g.includes("women")) ||
            g.includes("male") ||
            g === "m"
          );
        if (gf === "kids")
          return (
            g.includes("kid") ||
            g.includes("child") ||
            g.includes("boy") ||
            g.includes("girl")
          );
        if (gf === "unisex") return g.includes("unisex") || g === "all";
        return g === gf;
      });
    }
    if (categoryFilter !== "All") {
      list = list.filter((p) => (p.category || "") === categoryFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          p.brand.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allProducts, genderFilter, categoryFilter, query]);

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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Shop</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">All products</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? "Loading collection…"
              : `${products.length} piece${products.length === 1 ? "" : "s"} ${genderFilter !== "All" ? `for ${genderFilter}` : ""} ${categoryFilter !== "All" ? `in ${categoryFilter}` : ""}`.trim()}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-80">
            <Search className="size-4 text-muted-foreground" />
            <input
              aria-label="Search products"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {genders.length > 0 && (
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              onClick={() => setGenderFilter("All")}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                genderFilter === "All"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              Everyone
            </button>
            {genders.map((g) => (
              <button
                key={g.slug}
                onClick={() => setGenderFilter(g.name)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  genderFilter === g.name
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {g.name} <span className="ml-1 opacity-60">{g.count}</span>
              </button>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              onClick={() => setCategoryFilter("All")}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                categoryFilter === "All"
                  ? "border-accent bg-accent text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              All categories
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategoryFilter(c.name)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  categoryFilter === c.name
                    ? "border-accent bg-accent text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {c.name} <span className="ml-1 opacity-60">{c.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-sm font-medium">No products found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different filter or search term.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setGenderFilter("All");
                  setCategoryFilter("All");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} added={justAdded === p.id} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-gradient-to-r from-accent/5 to-transparent p-6 text-center sm:p-8">
          <p className="font-display text-lg font-medium">Like what you see?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Join StyleAI to save favourites, track orders, and get AI-styled recommendations.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/register">Create account <ArrowRight /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}