// components/dashboard/brand-workspace.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, Briefcase, Plus, Sparkles, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle, StatusPill } from "@/components/ui-kit";
import { Panel } from "@/components/ui-kit";
import { influencersApi, type Influencer } from "@/lib/influencers";
import {
  recommendationsApi, type Recommendation,
} from "@/lib/recommendations";
import { type BrandAnalytics } from "@/lib/analytics";
import { type Product as RealProduct } from "@/lib/products";
import { TrendPanel } from "./trend-panel";
import { StorefrontApplicationCard } from "./storefront-application-card";

export function BrandWorkspace({
  products,
  loading,
  analytics,
}: {
  products: RealProduct[];
  loading: boolean;
  analytics: BrandAnalytics | null;
}) {
  const displayed = products.slice(0, 4);

  const [topRec, setTopRec] = useState<Recommendation | null>(null);
  const [matchedInfluencers, setMatchedInfluencers] = useState<Influencer[]>([]);
  const [influencersLoading, setInfluencersLoading] = useState(false);

  const brandCategories = Array.from(
    new Set(
      products
        .map((p) => (p.category ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();

  useEffect(() => {
    recommendationsApi
      .list()
      .then((r) => setTopRec(r.recommendations?.[0] ?? null))
      .catch(() => setTopRec(null));
  }, []);

  useEffect(() => {
    if (loading || brandCategories.length === 0) {
      setMatchedInfluencers([]);
      return;
    }
    setInfluencersLoading(true);
    influencersApi
      .list({ categories: brandCategories.join(","), limit: 40 })
      .then((res) => {
        const matched = res.influencers.filter((inf) => {
          if (!inf.categories?.length) return false;
          const lowerInfCats = inf.categories.map((c) => c.toLowerCase());
          return lowerInfCats.some((c) =>
            brandCategories.some((bc) => c.includes(bc) || bc.includes(c))
          );
        });
        setMatchedInfluencers(matched);
      })
      .catch(() => setMatchedInfluencers([]))
      .finally(() => setInfluencersLoading(false));
  }, [products, loading]);

  const trendSeries = analytics
    ? Array.from({ length: 6 }, (_, i) => ({
        day: `Wk ${i + 1}`,
        revenue: Math.round((analytics.summary.revenue || 0) / 6),
        conversions: Math.round((analytics.summary.conversions || 0) / 6),
      }))
    : [];

  return (
    <>
      <StorefrontApplicationCard />

      <section className="mt-6">
        <div className="rounded-xl border border-border bg-gradient-to-r from-accent/5 via-transparent to-transparent p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
              <Briefcase className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">Need agency support?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hire agencies for website management, campaigns, and system ops.
              </p>
            </div>
            <Button asChild>
              <Link to="/agency/browse">
                Browse agencies <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <TrendPanel
          title="Revenue and conversions"
          description="Attributed to creator campaigns."
          series={trendSeries}
        />
        <Panel>
          <SectionTitle
            title="AI decision brief"
            description="The highest-impact action now."
          />
          {topRec ? (
            <div className="rounded-md border border-border bg-brand-soft p-4">
              <p className="text-xs font-semibold text-accent">
                {topRec.confidence}% confidence
              </p>
              <h3 className="mt-2 font-display text-2xl">{topRec.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {topRec.reason}
              </p>
              <Button asChild size="sm" className="mt-5">
                <Link to="/recommendations">
                  Review recommendation <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <Sparkles className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                No recommendations yet. Complete a campaign to unlock AI guidance.
              </p>
            </div>
          )}
        </Panel>
      </div>

      <section className="mt-8">
        <SectionTitle
          title="Creators matching your brand"
          description={
            brandCategories.length > 0
              ? `Influencers in your categories: ${brandCategories.join(", ")}`
              : "Add products to your catalog to discover matching creators."
          }
          action={
            matchedInfluencers.length > 0 ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/influencers">
                  See all creators <ArrowRight />
                </Link>
              </Button>
            ) : null
          }
        />

        {loading || influencersLoading ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Finding creators that match your brand…
          </div>
        ) : brandCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <UsersRound className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No products yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add products with categories (like Clothing, Footwear) to see creators that match your niche.
            </p>
            <Button asChild className="mt-4">
              <Link to="/products">
                <Plus /> Add product
              </Link>
            </Button>
          </div>
        ) : matchedInfluencers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <UsersRound className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No matching creators yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No influencers have registered with categories matching{" "}
              <span className="font-medium">{brandCategories.join(", ")}</span> yet.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/influencers">Browse all creators</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {matchedInfluencers.slice(0, 4).map((inf) => (
              <Link
                key={inf.id}
                to="/influencers/$slug"
                params={{ slug: inf.slug }}
                className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lift"
              >
                <div className="relative aspect-square overflow-hidden bg-muted/30">
                  {inf.avatarUrl ? (
                    <img
                      src={inf.avatarUrl}
                      alt={inf.displayName}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-display text-3xl font-medium text-muted-foreground">
                      {inf.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!inf.profileCompleted && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      Incomplete
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="truncate font-display text-base font-medium">
                    {inf.displayName}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    @{inf.username}
                    {inf.country ? ` · ${inf.country}` : ""}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="tabular-nums">
                      {inf.followerCount >= 1_000_000
                        ? `${(inf.followerCount / 1_000_000).toFixed(1)}M`
                        : inf.followerCount >= 1_000
                        ? `${(inf.followerCount / 1_000).toFixed(1)}K`
                        : inf.followerCount}{" "}
                      followers
                    </span>
                    <span className="tabular-nums text-accent">
                      {(inf.engagementRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  {inf.categories.length > 0 && (
                    <p className="mt-2 line-clamp-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {inf.categories.join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle
          title="Products in motion"
          description="Your real catalog — live from your brand."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/products">Open catalog</Link>
            </Button>
          }
        />

        {loading ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Loading your products…
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No products yet. Add your first product to see it here.
            </p>
            <Button asChild className="mt-4">
              <Link to="/products">
                <Plus /> Add product
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {displayed.map((product) => (
              <Link
                key={product.id}
                to="/products/$slug"
                params={{ slug: product.id }}
                className="group overflow-hidden rounded-lg border border-border bg-card"
              >
                {product.primaryImage ? (
                  <img
                    src={product.primaryImage}
                    alt={product.name}
                    className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="grid h-40 w-full place-items-center bg-muted/30 text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <div className="p-4">
                  <StatusPill
                    status={
                      product.inventory != null && product.inventory > 0
                        ? "Active"
                        : "Draft"
                    }
                  />
                  <h3 className="mt-3 font-display text-xl">{product.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {product.category ?? "Uncategorised"} · {product.inventory ?? 0} in stock
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}