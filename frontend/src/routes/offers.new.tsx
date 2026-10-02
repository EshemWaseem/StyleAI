// routes/offers.new.tsx
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OfferBuilder } from "@/components/offers/OfferBuilder";
import { InfluencerPicker } from "@/components/offers/InfluencerPicker";
import { pricingApi } from "@/lib/pricing";
import { http } from "@/lib/api";

interface Search {
  influencerId?: string;
  brandId?: string;
}

export const Route = createFileRoute("/offers/new")({
  head: () => ({ meta: [{ title: "New Offer — StyleAI" }] }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["influencerId"] === "string") out.influencerId = s["influencerId"];
    if (typeof s["brandId"] === "string") out.brandId = s["brandId"];
    return out;
  },
  component: NewOfferPage,
});

function NewOfferPage() {
  const navigate = useNavigate();
  const { influencerId: urlInfluencerId, brandId } = useSearch({ from: Route.id });

  // Local state — set by picker if URL doesn't have it
  const [pickedInfluencerId, setPickedInfluencerId] = useState<string | null>(null);
  const influencerId = urlInfluencerId || pickedInfluencerId;

  const [pricing, setPricing] = useState<any | null>(null);
  const [resolvedBrandId, setResolvedBrandId] = useState<string | null>(brandId || null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [error, setError] = useState("");

  // Resolve brand (once)
  useEffect(() => {
    if (brandId) return;
    http
      .get<{ brands: any[] }>("/api/brands")
      .then((r) => {
        if (r.brands?.[0]?.id) setResolvedBrandId(r.brands[0].id);
      })
      .catch(() => {});
  }, [brandId]);

  // Load pricing when influencerId is known
  useEffect(() => {
    if (!influencerId) {
      setPricing(null);
      setError("");
      return;
    }
    setPricingLoading(true);
    setError("");
    pricingApi
      .getPricing(influencerId)
      .then((r) => setPricing(r.pricing))
      .catch((e) => setError(e?.message || "Failed to load influencer pricing"))
      .finally(() => setPricingLoading(false));
  }, [influencerId]);

  // ------- No brand yet -------
  if (!resolvedBrandId) {
    return (
      <ProtectedRoute roles={["BRAND_OWNER", "BRAND_TEAM_MEMBER"]}>
        <>
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            You need a brand first. Create your brand before making offers.
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate({ to: "/offers" })}>
              <ArrowLeft className="mr-1 size-4" /> Back to offers
            </Button>
          </div>
        </>
      </ProtectedRoute>
    );
  }

  // ------- Show picker if no influencer selected -------
  const showPicker = !influencerId;

  return (
    <ProtectedRoute roles={["BRAND_OWNER", "BRAND_TEAM_MEMBER"]}>
      <>
        <PageHeader
          eyebrow="Custom offer"
          title={
            pricing
              ? `Offer for ${pricing.displayName}`
              : showPicker
              ? "New offer"
              : "New offer"
          }
          description={
            showPicker
              ? "Pick an influencer, bundle items, see live pricing, then save as draft."
              : "Bundle items, see live pricing, then save as draft."
          }
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/offers">
                <ArrowLeft className="mr-1 size-4" /> All offers
              </Link>
            </Button>
          }
        />

        {/* Error banner */}
        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* -------- State 1: picker -------- */}
        {showPicker && (
          <InfluencerPicker
            onSelect={(id) => setPickedInfluencerId(id)}
            onCancel={() => navigate({ to: "/offers" })}
          />
        )}

        {/* -------- State 2: loading pricing -------- */}
        {!showPicker && pricingLoading && (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Loading influencer pricing…
            </span>
          </div>
        )}

        {/* -------- State 3: builder -------- */}
        {!showPicker && !pricingLoading && pricing && (
          <Panel className="mt-8 p-6">
            <OfferBuilder
              brandId={resolvedBrandId}
              influencerId={influencerId!}
              influencerName={pricing.displayName}
              influencerPricing={pricing.pricingTiers || {}}
              onCancel={() => {
                // If user picked manually, go back to picker. Otherwise back to offers list.
                if (!urlInfluencerId) {
                  setPickedInfluencerId(null);
                  setPricing(null);
                } else {
                  navigate({ to: "/offers" });
                }
              }}
              onCreated={(offerId) =>
                navigate({ to: "/offers/$id", params: { id: offerId } })
              }
            />
          </Panel>
        )}
      </>
    </ProtectedRoute>
  );
}