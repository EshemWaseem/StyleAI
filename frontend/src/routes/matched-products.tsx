import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { influencersApi, type Influencer } from "@/lib/influencers";
import { publicProductsApi, type PublicProduct } from "@/lib/products";

export const Route = createFileRoute("/matched-products")({
  head: () => ({
    meta: [
      { title: "Products in your niche — StyleAI" },
      {
        name: "description",
        content: "Browse all live products that match your creator niche.",
      },
    ],
  }),
  component: MatchedProductsPage,
});

function MatchedProductsPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Influencer | null>(null);
  const [allProducts, setAllProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ---------- Auth guard ----------
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
    }
  }, [authLoading, user, navigate]);

  // ---------- Load profile + all public products ----------
  useEffect(() => {
    if (authLoading || !user || user.pendingApproval) return;

    setLoading(true);
    setError("");

    Promise.all([
      influencersApi.getMe().catch(() => null),
      publicProductsApi
        .list({ limit: 200 })
        .catch(() => ({ count: 0, products: [] as PublicProduct[] })),
    ])
      .then(([profileRes, productsRes]) => {
        setProfile(profileRes?.influencer ?? null);
        setAllProducts(productsRes.products ?? []);
      })
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  // ---------- Filter by influencer categories ----------
  const matchedProducts = useMemo(() => {
    if (!profile || !profile.categories?.length) return [];
    const lowerCats = profile.categories.map((c) => c.toLowerCase());

    return allProducts.filter((p) => {
      if (!p.category) return false;
      const pc = p.category.toLowerCase();
      return (
        lowerCats.includes(pc) ||
        lowerCats.some((lc) => pc.includes(lc) || lc.includes(pc))
      );
    });
  }, [profile, allProducts]);

  // ---------- Apply user filters ----------
  const filtered = useMemo(() => {
    let list = matchedProducts;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter);
    }

    if (brandFilter) {
      list = list.filter((p) => p.brand.slug === brandFilter);
    }

    return list;
  }, [matchedProducts, search, categoryFilter, brandFilter]);

  // ---------- Unique categories & brands for filters ----------
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    matchedProducts.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [matchedProducts]);

  const availableBrands = useMemo(() => {
    const map = new Map<string, string>();
    matchedProducts.forEach((p) => map.set(p.brand.slug, p.brand.name));
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [matchedProducts]);

  // ---------- Loading ----------
  if (authLoading || loading) {
    return (
      <AppShell breadcrumb={["Creator workspace", "Matched products"]}>
        <p className="text-sm text-muted-foreground">Loading products…</p>
      </AppShell>
    );
  }

  if (!user || user.pendingApproval) return null;

  const hasCategories = !!profile?.categories?.length;

  return (
    <AppShell breadcrumb={["Creator workspace", "Matched products"]}>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="mt-6">
        <PageHeader
          eyebrow="Creator workspace"
          title="Products that match your niche"
          description={
            hasCategories
              ? `Live products in ${profile!.categories.join(", ")} — explore, discover brands, and find collaboration opportunities.`
              : "Add categories to your profile to see matched products."
          }
        />
      </div>

      {!hasCategories ? (
        <div className="mt-8">
          <EmptyState
            title="No niche categories set"
            description="Add categories like clothing, footwear, or beauty to your profile so we can match you with the right products."
            action={
              profile ? (
                <Button asChild>
                  <Link to="/influencers/$slug" params={{ slug: profile.slug }}>
                    Add categories
                  </Link>
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <>
          {/* ---------- Search + filters ---------- */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-96">
              <Search className="size-4 text-muted-foreground" />
              <input
                aria-label="Search products"
                placeholder="Search products or brands…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal /> Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Brand
                </label>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All brands</option>
                  {availableBrands.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ---------- Grid or empty state ---------- */}
          {filtered.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title={
                  matchedProducts.length === 0
                    ? "No matching products yet"
                    : "No products match your filters"
                }
                description={
                  matchedProducts.length === 0
                    ? "No live products in your niche right now. Check back later or expand your categories."
                    : "Try clearing your filters or search term."
                }
              />
            </div>
          ) : (
            <>
              <p className="mt-6 text-xs text-muted-foreground">
                {filtered.length} product{filtered.length === 1 ? "" : "s"} ·
                matched to your niche
              </p>
              <section className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => (
                  <article
                    key={p.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift"
                  >
                    <Link
                      to="/products/$slug"
                      params={{ slug: p.id }}
                      className="block"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                        {p.primaryImage ? (
                          <img
                            src={p.primaryImage}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col space-y-2 p-4">
                      <div className="min-w-0">
                        <Link
                          to="/products/$slug"
                          params={{ slug: p.id }}
                          className="block truncate font-display text-base font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.brand.name}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                        <span className="font-medium tabular-nums">
                          {p.price != null
                            ? `${p.currency ?? "USD"} ${p.price}`
                            : "Price on request"}
                        </span>
                        {p.category && (
                          <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                            {p.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}