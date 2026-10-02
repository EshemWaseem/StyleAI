// frontend/src/routes/pricing.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PricingGrid } from "@/components/pricing/PricingGrid";
import { http } from "@/lib/api";
import type { PricingTiers } from "@/lib/pricing";

export const Route = createFileRoute("/influencer/pricing")({
  head: () => ({ meta: [{ title: "My Pricing — StyleAI" }] }),
  component: InfluencerPricingPage,
});

function InfluencerPricingPage() {
  const [influencer, setInfluencer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    http
      .get<{ influencer: any }>("/api/influencers/me")
      .then((r) => setInfluencer(r.influencer))
      .catch((e) => setError(e?.message || "Failed to load your influencer profile"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell breadcrumb={["Influencer", "Pricing"]}>
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (error || !influencer) {
    return (
      <ProtectedRoute>
        <AppShell breadcrumb={["Influencer", "Pricing"]}>
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error || "No influencer profile linked to your account."}</span>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const activePlatforms = (influencer.socialAccounts || []).map((s: any) =>
    String(s.platform).toUpperCase()
  );

  return (
    <ProtectedRoute roles={["INFLUENCER"]}>
      <AppShell breadcrumb={["Influencer", "Pricing"]}>
        <PageHeader
          eyebrow="Your profile"
          title="Pricing"
          description="Set per-platform, per-content-type rates. Brands see these when building custom offers."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/influencers/$slug" params={{ slug: influencer.slug }}>
                <ArrowLeft className="mr-1 size-4" /> View public profile
              </Link>
            </Button>
          }
        />

        <Panel className="mt-8 p-6">
          <PricingGrid
            influencerId={influencer.id}
            initialTiers={(influencer.pricingTiers as PricingTiers) || {}}
            initialCurrency={influencer.currency || "USD"}
            initialMinBudget={influencer.minBudget ?? null}
            initialAcceptsBundles={influencer.acceptsBundles ?? null}
            activePlatforms={activePlatforms}
          />
        </Panel>
      </AppShell>
    </ProtectedRoute>
  );
}