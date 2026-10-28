// components/dashboard/influencer-workspace.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BadgeDollarSign, Camera, ExternalLink, FileCheck2,
  Pencil, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui-kit";
import { influencersApi, type Influencer } from "@/lib/influencers";
import { publicProductsApi, type PublicProduct } from "@/lib/products";
import { InfluencerFormModal } from "@/components/influencer/InfluencerFormModal";

export function InfluencerWorkspace() {
  const [profile, setProfile] = useState<Influencer | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<PublicProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  async function loadProfile() {
    try {
      const res = await influencersApi.getMe();
      setProfile(res.influencer);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile || !profile.categories?.length) {
      setMatchedProducts([]);
      return;
    }
    setProductsLoading(true);
    publicProductsApi
      .list({ limit: 40 })
      .then((res) => {
        const lowerCats = profile.categories.map((c) => c.toLowerCase());
        const matched = res.products.filter((p) => {
          if (!p.category) return false;
          const pc = p.category.toLowerCase();
          return (
            lowerCats.includes(pc) ||
            lowerCats.some((lc) => pc.includes(lc) || lc.includes(pc))
          );
        });
        setMatchedProducts(matched);
      })
      .catch(() => setMatchedProducts([]))
      .finally(() => setProductsLoading(false));
  }, [profile]);

  if (loading) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load your profile. Please try again.
        </p>
      </div>
    );
  }

  const needsSetup = !profile.profileCompleted;

  const pricingTiers = (profile.pricingTiers as any) || {};
  const platformCount = Object.keys(pricingTiers).length;
  const totalTiers = Object.values(pricingTiers).reduce(
    (sum: number, p: any) => sum + Object.keys(p || {}).length,
    0
  );
  const hasPricing = totalTiers > 0;

  return (
    <>
      {needsSetup && (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Complete your profile</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add your bio, social accounts, and categories so brands can discover you.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowEditModal(true)}>
              Setup profile
            </Button>
          </div>
        </div>
      )}

      <Panel className="mt-6">
        <SectionTitle
          title="Your public profile"
          description="This is what brands and agencies see when they visit your profile."
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                <Pencil className="mr-1.5 size-3.5" /> Edit
              </Button>
              <Button asChild size="sm">
                <Link to="/influencers/$slug" params={{ slug: profile.slug }}>
                  <ExternalLink className="mr-1.5 size-3.5" /> View
                </Link>
              </Button>
            </div>
          }
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-muted text-xl font-medium text-muted-foreground">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-medium">
              {profile.displayName}
            </h3>
            <p className="text-sm text-muted-foreground">
              @{profile.username} · {profile.country || "No location"}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span>
                <strong className="text-foreground">
                  {profile.followerCount.toLocaleString()}
                </strong>{" "}
                followers
              </span>
              <span>
                <strong className="text-foreground">
                  {(profile.engagementRate * 100).toFixed(2)}%
                </strong>{" "}
                engagement
              </span>
            </div>
          </div>
        </div>
      </Panel>

      <section className="mt-6">
        <div className="rounded-xl border border-border bg-gradient-to-r from-purple-500/5 via-transparent to-transparent p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-purple-500/15 text-purple-500">
              <Camera className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">
                Need a photoshoot or video?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hire photographers and videographers for professional content.
              </p>
            </div>
            <Button asChild>
              <Link to="/agency/browse">
                Hire creators <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Panel className="mt-6">
        <SectionTitle
          title="Your pricing"
          description={
            hasPricing
              ? `${totalTiers} price${totalTiers === 1 ? "" : "s"} across ${platformCount} platform${platformCount === 1 ? "" : "s"} — what brands see when they create offers.`
              : "You haven't set any prices yet. Brands can't send offers without pricing."
          }
          action={
            <Button
              asChild
              size="sm"
              variant={hasPricing ? "outline" : "default"}
            >
              <Link to="/influencer/pricing">
                <BadgeDollarSign className="mr-1 size-4" />
                {hasPricing ? "Edit pricing" : "Set pricing"}
              </Link>
            </Button>
          }
        />

        {!hasPricing ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
            <BadgeDollarSign className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No prices set yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set per-platform rates (Instagram, TikTok, YouTube…) so brands can build custom offers.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(pricingTiers).map(([platform, tiers]: any) => (
              <div
                key={platform}
                className="rounded-lg border border-border bg-card p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {platform}
                </p>
                <div className="mt-2 space-y-1">
                  {Object.entries(tiers).map(([ct, price]: any) => (
                    <div key={ct} className="flex justify-between text-xs">
                      <span className="capitalize text-muted-foreground">
                        {ct.replace(/-/g, " ")}
                      </span>
                      <span className="tabular-nums font-medium">
                        {profile.currency} {Number(price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {(profile as any).minBudget != null && (
          <p className="mt-4 text-xs text-muted-foreground">
            Minimum campaign budget:{" "}
            <span className="font-medium text-foreground">
              {profile.currency} {Number((profile as any).minBudget).toFixed(2)}
            </span>
          </p>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <SectionTitle
            title="Products that match your niche"
            description={
              matchedProducts.length > 0
                ? `Top ${Math.min(2, matchedProducts.length)} of ${matchedProducts.length} products in ${profile.categories.join(", ")}`
                : "No products in your niche yet — explore or adjust your categories."
            }
            action={
              matchedProducts.length > 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/matched-products">Browse all</Link>
                </Button>
              ) : null
            }
          />

          {productsLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Finding products in your niche…
            </p>
          ) : matchedProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {matchedProducts.slice(0, 2).map((p) => (
                <Link
                  key={p.id}
                  to="/shop/product/$slug"
                  params={{ slug: p.id }}
                  className="group overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-lift"
                >
                  {p.primaryImage ? (
                    <img
                      src={p.primaryImage}
                      alt={p.name}
                      className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-32 w-full place-items-center bg-muted/30 text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    {p.category && (
                      <p className="text-xs text-accent">{p.category}</p>
                    )}
                    <h3 className="mt-1 font-display text-lg leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{p.brand.name}</p>
                    {p.price != null && (
                      <p className="mt-2 text-sm font-medium tabular-nums">
                        {p.currency} {p.price}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
              <Sparkles className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No matching products yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profile.categories.length === 0
                  ? "Add categories to your profile so we can find products in your niche."
                  : "No live products match your niche right now. Check back later."}
              </p>
              {profile.categories.length === 0 && (
                <Button asChild size="sm" className="mt-4">
                  <Link to="/influencers/$slug" params={{ slug: profile.slug }}>
                    Add categories
                  </Link>
                </Button>
              )}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionTitle
            title="Deliverables"
            description="Your next committed actions."
          />
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
            <FileCheck2 className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No deliverables</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accepted campaigns will show their tasks here.
            </p>
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <SectionTitle
            title="Your profile stats"
            description="Live data from your creator profile."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Followers
              </p>
              <p className="mt-2 font-display text-2xl font-medium tabular-nums">
                {profile.followerCount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Engagement
              </p>
              <p className="mt-2 font-display text-2xl font-medium tabular-nums">
                {(profile.engagementRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Starting rate
              </p>
              <p className="mt-2 font-display text-2xl font-medium tabular-nums">
                {profile.pricePerPost != null
                  ? `${profile.currency} ${profile.pricePerPost}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Status
              </p>
              <p className="mt-2 font-display text-2xl font-medium">
                {profile.availability === "AVAILABLE"
                  ? "Available"
                  : profile.availability}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {showEditModal && (
        <InfluencerFormModal
          mode="edit"
          influencer={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setProfile(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </>
  );
}