// routes/matching.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Sparkles, Package, Sliders,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MatchCard } from "@/components/matching/MatchCard";
import { matchingApi, type ProductMatchResponse } from "@/lib/matching";
import { productsApi, type Product } from "@/lib/products";

export const Route = createFileRoute("/matching")({
  head: () => ({ meta: [{ title: "AI Matching — StyleAI" }] }),
  component: MatchingPage,
});

function MatchingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [data, setData] = useState<ProductMatchResponse | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState("");

  // ---------- Slider value: instant (smooth UI) ----------
  const [minScore, setMinScore] = useState(0);

  // ---------- Applied value: debounced (triggers API) ----------
  const [appliedMinScore, setAppliedMinScore] = useState(0);

  // Load products once
  useEffect(() => {
    productsApi
      .list()
      .then((r) => {
        const list = r.products || [];
        setProducts(list);
        if (list.length > 0) setProductId(list[0].id);
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  // Debounce: minScore → appliedMinScore (400ms after user stops dragging)
  useEffect(() => {
    const t = setTimeout(() => setAppliedMinScore(minScore), 400);
    return () => clearTimeout(t);
  }, [minScore]);

  // Re-run matching only when product OR appliedMinScore changes
  useEffect(() => {
    if (!productId) return;

    let cancelled = false;
    setMatching(true);
    setError("");

    matchingApi
      .forProduct(productId, { limit: 30, minScore: appliedMinScore })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Matching failed");
      })
      .finally(() => {
        if (!cancelled) setMatching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, appliedMinScore]);

  return (
    <ProtectedRoute roles={["BRAND_OWNER", "BRAND_TEAM_MEMBER", "AGENCY", "SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Influencer intelligence", "AI matching"]}>
        <PageHeader
          eyebrow="AI matching"
          title="Find the right creators"
          description="Explainable scores based on category, niche, engagement, audience, and price."
        />

        {productsLoading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No products yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a product first — matching needs one to analyze.
            </p>
            <Button asChild className="mt-4">
              <Link to="/products">Go to products</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* ============ FILTERS (always visible — no flicker) ============ */}
            <Panel className="mt-6 p-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Product
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.sku}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Sliders className="size-3" /> Min score
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="mt-3 w-full cursor-pointer accent-accent"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {minScore}+
                    {minScore !== appliedMinScore && (
                      <span className="ml-2 text-accent">applying…</span>
                    )}
                  </p>
                </div>
              </div>
            </Panel>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
              </div>
            )}

            {/* ============ RESULT AREA (content never unmounts mid-fetch) ============ */}
            <div className="relative mt-6">
              {/* Subtle inline loader — does NOT hide the results */}
              {matching && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/40 backdrop-blur-[1px]">
                  <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
                    <Loader2 className="size-4 animate-spin text-accent" />
                    <span className="text-xs text-muted-foreground">
                      Re-scoring creators…
                    </span>
                  </div>
                </div>
              )}

              {!data ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center">
                  <Sparkles className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Loading matches…
                  </p>
                </div>
              ) : (
                <>
                  <section className="grid gap-4 sm:grid-cols-4">
                    <Stat label="Product" value={data.product.name} sub={data.product.category ?? "—"} />
                    <Stat
                      label="Candidates"
                      value={String(data.totalCandidates)}
                      sub={`${data.matches.length} passed`}
                    />
                    <Stat
                      label="Top score"
                      value={data.matches[0] ? `${data.matches[0].score}` : "—"}
                      sub={data.matches[0]?.influencer.displayName ?? "—"}
                    />
                    <Stat
                      label={data.aiPowered ? "AI powered" : "Fallback"}
                      value={data.aiPowered ? "✓ Live" : "Heuristic"}
                      sub={
                        data.aiPowered
                          ? `${data.provider} · ${data.latencyMs}ms`
                          : "AI service unavailable"
                      }
                    />
                  </section>

                  <section className="mt-8">
                    <SectionTitle
                      title="Recommended creators"
                      description={`Ranked by weighted match score (min ${appliedMinScore})`}
                    />
                    {data.matches.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-border p-12 text-center">
                        <Sparkles className="mx-auto size-6 text-muted-foreground" />
                        <p className="mt-3 text-sm text-muted-foreground">
                          No creators matched above {appliedMinScore}. Try lowering the threshold.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {data.matches.map((m, i) => (
                          <MatchCard key={m.influencer.id} match={m} rank={i + 1} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 truncate font-display text-lg font-medium">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}