import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, TrendingUp, Users, MousePointerClick,
  DollarSign, BarChart3, Eye, Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { analyticsApi } from "@/lib/analytics";
import type {
  AgencyAnalytics, BrandAnalytics, InfluencerAnalytics, PlatformAnalytics,
} from "@/lib/analytics";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — StyleAI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user } = useRole();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("SUPER_ADMIN" as any);
  const isAgency = roles.includes("AGENCY" as any);
  const isInfluencer = roles.includes("INFLUENCER" as any) && !isAgency;
  const isBrand = !isAdmin && !isAgency && !isInfluencer;

  useEffect(() => {
    if (!user) return;
    const fn = isAdmin
      ? analyticsApi.platform
      : isAgency
      ? analyticsApi.agency
      : isInfluencer
      ? analyticsApi.influencer
      : analyticsApi.brand;

    fn()
      .then((r) => setData(r))
      .catch((e) => setError(e?.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [user, isAdmin, isAgency, isInfluencer]);

  return (
    <ProtectedRoute>
      <AppShell breadcrumb={["Analytics"]}>
        <PageHeader
          eyebrow="Analytics"
          title={isAdmin ? "Platform analytics" : isAgency ? "Agency analytics" : isInfluencer ? "My performance" : "Brand analytics"}
          description={
            isAdmin
              ? "Every campaign, offer, and rupee on the platform."
              : isAgency
              ? "Performance across all client brands."
              : isInfluencer
              ? "Your reach, earnings, and campaign track record."
              : "Campaign ROI, creator performance, and channel breakdown."
          }
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading analytics…</span>
          </div>
        ) : !data ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <BarChart3 className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No analytics yet.</p>
          </div>
        ) : (
          <>
            {isAdmin && <AdminView data={data as PlatformAnalytics} />}
            {isBrand && <BrandView data={data as BrandAnalytics} />}
            {isAgency && <AgencyView data={data as AgencyAnalytics} />}
            {isInfluencer && <InfluencerView data={data as InfluencerAnalytics} />}
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

// ======================================================
// KPI card
// ======================================================
function Kpi({
  icon: Icon, label, value, note, accent = "accent",
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  note?: string;
  accent?: "accent" | "emerald" | "blue" | "amber";
}) {
  const colors = {
    accent: "bg-accent/15 text-accent",
    emerald: "bg-emerald-500/15 text-emerald-500",
    blue: "bg-blue-500/15 text-blue-500",
    amber: "bg-amber-500/15 text-amber-500",
  };
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md ${colors[accent]}`}>
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-3 font-display text-2xl font-medium tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </article>
  );
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ======================================================
// ADMIN
// ======================================================
function AdminView({ data }: { data: PlatformAnalytics }) {
  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BarChart3} label="Campaigns" value={String(data.campaigns.count)} />
        <Kpi icon={DollarSign} label="Revenue attributed" value={`$${fmtNum(data.campaigns.revenue)}`} accent="emerald" />
        <Kpi icon={TrendingUp} label="Budget deployed" value={`$${fmtNum(data.campaigns.budgetDeployed)}`} accent="blue" />
        <Kpi icon={Users} label="Wallet held" value={`$${fmtNum(data.walletsHeld)}`} accent="amber" />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Eye} label="Reach" value={fmtNum(data.deliverableTotals.reach)} />
        <Kpi icon={TrendingUp} label="Impressions" value={fmtNum(data.deliverableTotals.impressions)} />
        <Kpi icon={MousePointerClick} label="Clicks" value={fmtNum(data.deliverableTotals.clicks)} />
        <Kpi icon={Target} label="Conversions" value={fmtNum(data.deliverableTotals.conversions)} accent="emerald" />
      </section>

      <Panel className="mt-8 overflow-hidden">
        <SectionTitle title="Offers by status" description="Volume + platform fee across the lifecycle." />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Count</th>
              <th className="p-3 font-medium text-right">Volume</th>
              <th className="p-3 font-medium text-right">Platform fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.offers.map((o) => (
              <tr key={o.status}>
                <td className="p-3">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
                    {o.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3 text-right tabular-nums">{o.count}</td>
                <td className="p-3 text-right tabular-nums">${o.totalVolume.toFixed(2)}</td>
                <td className="p-3 text-right tabular-nums text-emerald-500">${o.platformFee.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

// ======================================================
// BRAND
// ======================================================
function BrandView({ data }: { data: BrandAnalytics }) {
  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BarChart3} label="Campaigns" value={String(data.campaignCount)} note={`${data.activeCampaigns} active · ${data.completedCampaigns} completed`} />
        <Kpi icon={DollarSign} label="Revenue" value={`$${fmtNum(data.summary.revenue)}`} accent="emerald" />
        <Kpi icon={TrendingUp} label="Spent" value={`$${fmtNum(data.summary.budget || 0)}`} accent="blue" />
        <Kpi
          icon={Target}
          label="ROI"
          value={`${data.roi.toFixed(2)}×`}
          accent={data.roi >= 1 ? "emerald" : "amber"}
          note={data.roi >= 1 ? "Profitable" : "Below break-even"}
        />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Eye} label="Reach" value={fmtNum(data.summary.reach)} />
        <Kpi icon={TrendingUp} label="Impressions" value={fmtNum(data.summary.impressions)} />
        <Kpi icon={MousePointerClick} label="Clicks" value={fmtNum(data.summary.clicks)} />
        <Kpi icon={Target} label="Conversions" value={fmtNum(data.summary.conversions)} accent="emerald" />
      </section>

      {data.byInfluencer.length > 0 && (
        <Panel className="mt-8 overflow-hidden">
          <SectionTitle title="Top creators" description="Ranked by revenue generated." />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Creator</th>
                <th className="p-3 font-medium text-right">Campaigns</th>
                <th className="p-3 font-medium text-right">Reach</th>
                <th className="p-3 font-medium text-right">Clicks</th>
                <th className="p-3 font-medium text-right">Revenue</th>
                <th className="p-3 font-medium text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.byInfluencer.slice(0, 10).map((r) => (
                <tr key={r.influencer.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {r.influencer.avatarUrl ? (
                        <img src={r.influencer.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
                      ) : (
                        <div className="grid size-7 place-items-center rounded-full bg-accent/15 text-[10px] font-medium text-accent">
                          {r.influencer.displayName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium">{r.influencer.displayName}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right tabular-nums">{r.campaigns}</td>
                  <td className="p-3 text-right tabular-nums">{fmtNum(r.reach)}</td>
                  <td className="p-3 text-right tabular-nums">{fmtNum(r.clicks)}</td>
                  <td className="p-3 text-right tabular-nums text-emerald-500">${r.revenue.toFixed(2)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {r.budget > 0 ? `${(r.revenue / r.budget).toFixed(2)}×` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <CampaignsTable title="Recent campaigns" campaigns={data.recentCampaigns} />
    </>
  );
}

// ======================================================
// AGENCY
// ======================================================
function AgencyView({ data }: { data: AgencyAnalytics }) {
  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BarChart3} label="Campaigns" value={String(data.campaignCount)} note={`${data.activeCampaigns} active`} />
        <Kpi icon={DollarSign} label="Client revenue" value={`$${fmtNum(data.summary.revenue)}`} accent="emerald" />
        <Kpi icon={TrendingUp} label="Client budget" value={`$${fmtNum(data.summary.budget || 0)}`} accent="blue" />
        <Kpi
          icon={Target}
          label="Portfolio ROI"
          value={`${data.roi.toFixed(2)}×`}
          accent={data.roi >= 1 ? "emerald" : "amber"}
        />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Eye} label="Reach" value={fmtNum(data.summary.reach)} />
        <Kpi icon={TrendingUp} label="Impressions" value={fmtNum(data.summary.impressions)} />
        <Kpi icon={MousePointerClick} label="Clicks" value={fmtNum(data.summary.clicks)} />
        <Kpi icon={Target} label="Conversions" value={fmtNum(data.summary.conversions)} accent="emerald" />
      </section>

      {data.byBrand.length > 0 && (
        <Panel className="mt-8 overflow-hidden">
          <SectionTitle title="By client brand" description="Revenue + ROI per client." />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Brand</th>
                <th className="p-3 font-medium text-right">Campaigns</th>
                <th className="p-3 font-medium text-right">Reach</th>
                <th className="p-3 font-medium text-right">Revenue</th>
                <th className="p-3 font-medium text-right">Budget</th>
                <th className="p-3 font-medium text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.byBrand.map((r) => (
                <tr key={r.brand.id}>
                  <td className="p-3 font-medium">{r.brand.name}</td>
                  <td className="p-3 text-right tabular-nums">{r.campaigns}</td>
                  <td className="p-3 text-right tabular-nums">{fmtNum(r.reach)}</td>
                  <td className="p-3 text-right tabular-nums text-emerald-500">${r.revenue.toFixed(2)}</td>
                  <td className="p-3 text-right tabular-nums">${r.budget.toFixed(2)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {r.budget > 0 ? `${(r.revenue / r.budget).toFixed(2)}×` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <CampaignsTable title="Recent campaigns" campaigns={data.recentCampaigns} showBrand />
    </>
  );
}

// ======================================================
// INFLUENCER
// ======================================================
function InfluencerView({ data }: { data: InfluencerAnalytics }) {
  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BarChart3} label="Campaigns" value={String(data.campaignCount)} note={`${data.activeCampaigns} active · ${data.completedCampaigns} completed`} />
        <Kpi icon={DollarSign} label="Total earned" value={`$${fmtNum(data.summary.earnings || 0)}`} accent="emerald" />
        <Kpi icon={Eye} label="Total reach" value={fmtNum(data.summary.reach)} accent="blue" />
        <Kpi icon={MousePointerClick} label="Total clicks" value={fmtNum(data.summary.clicks)} />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kpi icon={TrendingUp} label="Impressions" value={fmtNum(data.summary.impressions)} />
        <Kpi icon={Target} label="Conversions" value={fmtNum(data.summary.conversions)} accent="emerald" />
        <Kpi icon={DollarSign} label="Revenue generated" value={`$${fmtNum(data.summary.revenue)}`} accent="amber" note="For your brands" />
      </section>

      <CampaignsTable title="Recent campaigns" campaigns={data.recentCampaigns} showBrand />
    </>
  );
}

// ======================================================
// SHARED — campaigns table
// ======================================================
function CampaignsTable({
  title, campaigns, showBrand = false,
}: {
  title: string;
  campaigns: any[];
  showBrand?: boolean;
}) {
  if (!campaigns || campaigns.length === 0) return null;

  return (
    <Panel className="mt-8 overflow-hidden">
      <SectionTitle title={title} description="Latest activity." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Campaign</th>
              {showBrand && <th className="p-3 font-medium">Brand</th>}
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Reach</th>
              <th className="p-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-accent/5">
                <td className="p-3">
                  <Link to="/campaigns/$id" params={{ id: c.id }} className="font-medium hover:underline">
                    {c.title}
                  </Link>
                </td>
                {showBrand && (
                  <td className="p-3 text-muted-foreground">{c.brand?.name ?? "—"}</td>
                )}
                <td className="p-3 text-xs">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
                    {c.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3 text-right tabular-nums">{fmtNum(c.reach || 0)}</td>
                <td className="p-3 text-right tabular-nums text-emerald-500">
                  {c.currency} {Number(c.revenue || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}