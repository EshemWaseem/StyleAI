// routes/shop/gender.$slug.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/shop/product-card";
import { PublicHeader } from "@/components/shop/public-header";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { publicProductsApi, type PublicProduct } from "@/lib/products";
import { deriveCategories } from "@/lib/categories";
import { SEO } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/gender/$slug")({
  head: ({ params }) => {
    const name = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
    const title = `${name} — StyleAI`;
    const description = `Shop ${name} collection on StyleAI — AI-styled fashion from approved brands.`;
    const path = `/shop/gender/${params.slug}`;
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
  component: GenderPage,
});

function GenderPage() {
  const { slug } = Route.useParams();
  const [allGenderProducts, setAllGenderProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cart = useCart();

  // Fetch all products, then filter by gender client-side
  useEffect(() => {
    setLoading(true);
    publicProductsApi
      .list({ limit: 500 })
      .then((r) => {
        const gender = slug.toLowerCase();
        const matching = r.products.filter((p) => {
          const g = (p.gender || "unisex").toLowerCase();
          if (gender === "women")
            return g.includes("women") || g.includes("female") || g === "f";
          if (gender === "men")
            return (
              (g.includes("men") && !g.includes("women")) ||
              g.includes("male") ||
              g === "m"
            );
          if (gender === "kids")
            return (
              g.includes("kid") ||
              g.includes("child") ||
              g.includes("boy") ||
              g.includes("girl")
            );
          if (gender === "unisex") return g.includes("unisex") || g === "all";
          return g === gender;
        });
        setAllGenderProducts(matching);
      })
      .catch(() => setAllGenderProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  // Derive categories within this gender
  const { categories } = useMemo(
    () => deriveCategories(allGenderProducts),
    [allGenderProducts]
  );

  const genderName = slug.charAt(0).toUpperCase() + slug.slice(1);

  const products = useMemo(() => {
    let list = allGenderProducts;
    if (filter !== "All") {
      list = list.filter((p) => (p.category || "") === filter);
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
  }, [allGenderProducts, filter, query]);

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
            Shop for
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {genderName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? "Loading collection…"
              : `${products.length} piece${products.length === 1 ? "" : "s"} ${filter !== "All" ? `in ${filter}` : "available"}`}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input
            aria-label="Search in this gender"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              onClick={() => setFilter("All")}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                filter === "All"
                  ? "border-accent bg-accent text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setFilter(c.name)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  filter === c.name
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
              <p className="text-sm font-medium">No pieces available for {genderName} yet</p>
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