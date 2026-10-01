// components/pricing/PricingCard.tsx
import { Coins, AlertCircle } from "lucide-react";
import type { InfluencerPricing } from "@/lib/pricing";

interface Props {
  pricing: InfluencerPricing;
  /** Optional: highlight platforms recommended for this category */
  recommendedPlatforms?: string[];
}

export function PricingCard({ pricing, recommendedPlatforms = [] }: Props) {
  const tiers = pricing.pricingTiers || {};
  const platforms = Object.keys(tiers);

  if (platforms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Coins className="mx-auto size-5 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          This influencer hasn't published pricing yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-accent" />
            <h3 className="text-sm font-medium">Pricing</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {pricing.currency}
          </span>
        </div>
        {pricing.minBudget != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Minimum campaign budget: {pricing.currency} {pricing.minBudget.toFixed(2)}
          </p>
        )}
        {pricing.acceptsBundles === false && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
            <AlertCircle className="size-3" /> Single-item offers only
          </p>
        )}
      </div>

      <div className="divide-y divide-border">
        {platforms.map((p) => {
          const contentTypes = tiers[p as keyof typeof tiers] || {};
          const isRecommended = recommendedPlatforms.includes(p);
          return (
            <div key={p} className="px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {p}
                </span>
                {isRecommended && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                    ⭐ Recommended
                  </span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(contentTypes).map(([ct, price]) => (
                  <div
                    key={ct}
                    className="flex items-center justify-between rounded-md bg-accent/5 px-3 py-1.5"
                  >
                    <span className="text-xs capitalize text-muted-foreground">
                      {ct.replace(/-/g, " ")}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {pricing.currency} {Number(price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}