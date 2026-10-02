// routes/matched-products.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { influencersApi, type Influencer } from "@/lib/influencers";
import { matchingApi, type ProductMatchForMeResponse } from "@/lib/matching";

export const Route = createFileRoute("/matched-products")({
  head: () => ({
    meta: [
      { title: "Products in your niche — StyleAI" },
      {
        name: "description",
        content: "AI-ranked products that match your creator niche.",
      },
    ],
  }),
  component: MatchedProductsPage,
});

function MatchedProductsPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Influencer | null>(null);
  const [matchData, setMatchData] = useState<ProductMatchForMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // ---------- Auth guard ----------
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
    }
  }, [authLoading, user, navigate]);

  // ---------- Load profile once ----------
  useEffect(() => {
    if (authLoading || !user || user.pendingApproval) return;

    influencersApi
      .getMe()
      .then((res) => setProfile(res.influencer))
      .catch(() => setProfile(null))
      .finally(() => {
        // loading handled by matching effect below
      });
  }, [authLoading, user]);

  // ---------- AI matching (re-runs on minScore change) ----------
  useEffect(() => {
    if (authLoading || !user || user.pendingApproval) return;
    if (!profile) return;

    setMatching(true);
    setError("");

    matchingApi
      .forMe({ limit: 60, minScore })
      .then((r) => setMatchData(r))
      .catch((err) => setError(err?.message || "Failed to load matches"))
      .finally(() => {
        setMatching(false);
        setLoading(false);
      });
  }, [authLoading, user, profile, minScore]);

  // ---------- Extract product list from matchData ----------
  const matchedProducts = useMemo(() => {
    return matchData?.matches ?? [];
  }, [matchData]);

  // ---------- Apply search + category + brand filters ----------
  const filtered = useMemo(() => {
    let list = matchedProducts;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.product.name.toLowerCase().includes(q) ||
          m.product.brand.name.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      list = list.filter((m) => m.product.category === categoryFilter);
    }

    if (brandFilter) {
      list = list.filter((m) => m.product.brand.slug === brandFilter);
    }

    return list;
  }, [matchedProducts, search, categoryFilter, brandFilter]);

  // ---------- Unique categories & brands for filter dropdowns ----------
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    matchedProducts.forEach((m) => m.product.category && set.add(m.product.category));
    return Array.from(set).sort();
  }, [matchedProducts]);

  const availableBrands = useMemo(() => {
    const map = new Map<string, string>();
    matchedProducts.forEach((m) => map.set(m.product.brand.slug, m.product.brand.name));
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [matchedProducts]);

  // ---------- Loading ----------
  if (authLoading || loading) {
    return (
      <>
        <div className="mt-12 flex flex-col items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Scoring products for you…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            First run can take 30–60s while the AI warms up.
          </p>
        </div>
      </>
    );
  }

  if (!user || user.pendingApproval) return null;

  const hasCategories = !!profile?.categories?.length;

  return (
    <>
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
              ? `AI-ranked products for ${profile!.categories.join(", ")} — with explained match scores.`
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
          {/* ---------- AI status banner ---------- */}
          {matchData && (
            <div className="mt-6 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className={`size-3.5 ${matchData.aiPowered ? "text-accent" : "text-muted-foreground"}`} />
                  <span className="font-medium">
                    {matchData.aiPowered ? "AI powered" : "Heuristic match"}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {matchData.matches.length} match
                  {matchData.matches.length === 1 ? "" : "es"} out of{" "}
                  {matchData.totalCandidates} products
                </span>
                {matchData.aiPowered && (
                  <span className="text-muted-foreground">
                    · {matchData.provider} · {matchData.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          )}

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
            {matching && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Re-scoring…
              </span>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Min match score: <span className="text-foreground">{minScore}+</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="mt-3 w-full"
                />
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
                    : "Try clearing your filters, lowering the min score, or changing your search term."
                }
              />
            </div>
          ) : (
            <>
              <p className="mt-6 text-xs text-muted-foreground">
                {filtered.length} product{filtered.length === 1 ? "" : "s"} ·
                ranked by AI match score
              </p>
              <section className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((m) => {
                  const p = m.product;
                  const tone =
                    m.score >= 80
                      ? "bg-emerald-500/15 text-emerald-500"
                      : m.score >= 60
                      ? "bg-blue-500/15 text-blue-500"
                      : m.score >= 40
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-muted text-muted-foreground";

                  return (
                    <article
                      key={p.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift"
                    >
                      <div className="relative">
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

                        {/* Match score badge */}
                        <span
                          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone}`}
                          title={`Match score: ${Math.round(m.score)}/100`}
                        >
                          <Sparkles className="size-3" />
                          {Math.round(m.score)}
                        </span>
                      </div>

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

                        {/* AI verdict */}
                        {m.verdict && (
                          <p className="line-clamp-2 text-[11px] italic text-muted-foreground">
                            "{m.verdict}"
                          </p>
                        )}

                        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
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
                  );
                })}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}