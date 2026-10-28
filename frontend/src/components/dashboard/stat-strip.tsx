// components/dashboard/stat-strip.tsx
import type { BrandAnalytics, InfluencerAnalytics } from "@/lib/analytics";
import type { Stat, WorkspaceKey } from "./types";
import { roleStats } from "./types";

export function StatStrip({
  role,
  analytics,
  influencerAnalytics,
}: {
  role: WorkspaceKey;
  analytics?: BrandAnalytics | null;
  influencerAnalytics?: InfluencerAnalytics | null;
}) {
  const ownerStats: Stat[] | null =
    role === "owner" && analytics
      ? [
          {
            label: "Total spend",
            value: `${analytics.currency || "PKR"} ${(
              (analytics.summary as any).totalSpend ?? 0
            ).toLocaleString()}`,
            note: `${analytics.campaignCount} campaign${
              analytics.campaignCount === 1 ? "" : "s"
            } created`,
          },
          {
            label: "Active campaigns",
            value: String(analytics.activeCampaigns ?? 0),
            note: `${analytics.completedCampaigns ?? 0} completed`,
          },
          {
            label: "Attributed revenue",
            value: `${analytics.currency || "PKR"} ${(
              analytics.summary.revenue || 0
            ).toLocaleString()}`,
            note:
              (analytics.summary.revenue || 0) > 0
                ? `ROI ${analytics.roi.toFixed(2)}×`
                : "From published content",
            tone:
              analytics.roi >= 1
                ? "success"
                : (analytics.summary.revenue || 0) > 0
                ? "warning"
                : undefined,
          },
          {
            label: "Deliverables",
            value: String((analytics as any).deliverableCount ?? 0),
            note:
              ((analytics as any).pendingApprovals ?? 0) > 0
                ? `${(analytics as any).pendingApprovals} awaiting review`
                : "All caught up",
            tone:
              ((analytics as any).pendingApprovals ?? 0) > 0
                ? "warning"
                : undefined,
          },
        ]
      : null;

  const influencerStats: Stat[] | null =
    role === "influencer" && influencerAnalytics
      ? [
          {
            label: "Total earnings",
            value: `${influencerAnalytics.currency || "PKR"} ${Number(
              influencerAnalytics.summary?.revenue ?? 0
            ).toLocaleString()}`,
            note: "From completed campaigns",
            tone:
              (influencerAnalytics.summary?.revenue ?? 0) > 0
                ? "success"
                : undefined,
          },
          {
            label: "Active campaigns",
            value: String(influencerAnalytics.activeCampaigns ?? 0),
            note: `${influencerAnalytics.campaignCount ?? 0} total`,
          },
          {
            label: "Completed",
            value: String(influencerAnalytics.completedCampaigns ?? 0),
            note: "Delivered campaigns",
            tone:
              (influencerAnalytics.completedCampaigns ?? 0) > 0
                ? "success"
                : undefined,
          },
          {
            label: "Total reach",
            value: Number(
              influencerAnalytics.summary?.reach ?? 0
            ).toLocaleString(),
            note: "Across all campaigns",
          },
        ]
      : null;

  const stats: Stat[] = ownerStats || influencerStats || roleStats[role];

  return (
    <section className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <article key={stat.label} className="bg-card p-5">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-3 font-display text-3xl text-foreground">{stat.value}</p>
          <p
            className={`mt-2 text-xs ${
              stat.tone === "success"
                ? "text-success"
                : stat.tone === "warning"
                ? "text-warning"
                : "text-muted-foreground"
            }`}
          >
            {stat.note}
          </p>
        </article>
      ))}
    </section>
  );
}