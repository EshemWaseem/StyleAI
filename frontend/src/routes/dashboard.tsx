// frontend/src/routes/dashboard.tsx
import { Briefcase, Camera } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { influencersApi, type Influencer } from "@/lib/influencers";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Layers3,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle, StatusPill } from "@/components/ui-kit";
import { useRole, roleLabels, type RoleName } from "@/lib/role";
import { analyticsApi, type BrandAnalytics } from "@/lib/analytics";
import { recommendationsApi, type Recommendation } from "@/lib/recommendations";
import {
  productsApi,
  publicProductsApi,
  type Product as RealProduct,
  type PublicProduct,
} from "@/lib/products";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Role Workspace — StyleAI" },
      { name: "description", content: "A role-adaptive StyleAI command center." },
    ],
  }),
  component: Dashboard,
});

// ======================================================
// Workspace key
// ======================================================

type WorkspaceKey = "admin" | "owner" | "member" | "influencer" | "agency";

const ROLE_TO_WORKSPACE: Record<RoleName, WorkspaceKey> = {
  SUPER_ADMIN: "admin",
  BRAND_OWNER: "owner",
  BRAND_TEAM_MEMBER: "member",
  INFLUENCER: "influencer",
  AGENCY: "agency",
  SHOPPER: "owner",
};

function pickWorkspace(roles: RoleName[]): WorkspaceKey {
  const priority: RoleName[] = [
    "SUPER_ADMIN",
    "AGENCY",
    "BRAND_OWNER",
    "BRAND_TEAM_MEMBER",
    "INFLUENCER",
  ];
  for (const r of priority) {
    if (roles.includes(r)) return ROLE_TO_WORKSPACE[r];
  }
  return "owner";
}

// ======================================================
// Copy + stats
// ======================================================

type Stat = {
  label: string;
  value: string;
  note: string;
  tone?: "success" | "warning";
};

const roleCopy: Record<
  WorkspaceKey,
  { eyebrow: string; title: string; description: string }
> = {
  admin: {
    eyebrow: "Global control plane",
    title: "Platform command center",
    description: "Monitor every organization, model, and trust signal across StyleAI.",
  },
  influencer: {
    eyebrow: "Creator workspace",
    title: "Your creative business, in motion.",
    description:
      "Manage brand opportunities, deliverables, earnings, and audience growth.",
  },
  owner: {
    eyebrow: "Brand command",
    title: "Your brand, in motion.",
    description: "Move every product from understanding to measurable growth.",
  },
  agency: {
    eyebrow: "Agency portfolio",
    title: "Your agency, in motion.",
    description:
      "Balance approvals, creator delivery, and performance across your brand portfolio.",
  },
  member: {
    eyebrow: "My workspace",
    title: "Your priorities for today.",
    description: "Draft, review, and deliver the work assigned to you.",
  },
};

const roleStats: Record<WorkspaceKey, Stat[]> = {
  admin: [
    { label: "Organizations", value: "164", note: "+8 this month", tone: "success" },
    { label: "Active users", value: "8,420", note: "72% weekly active" },
    { label: "AI requests", value: "1.82M", note: "+11.2% this week" },
    { label: "Median latency", value: "1.8s", note: "Within SLO", tone: "success" },
  ],
  influencer: [
    { label: "Available balance", value: "$8,420", note: "$3,200 processing" },
    { label: "Active collaborations", value: "4", note: "2 deliverables this week" },
    { label: "Avg. engagement", value: "6.1%", note: "+0.8% this quarter", tone: "success" },
    { label: "Profile views", value: "12.8K", note: "+24% from brands", tone: "success" },
  ],
  owner: [
    { label: "Attributed revenue", value: "$48,240", note: "+18.4% vs last month", tone: "success" },
    { label: "Campaign ROI", value: "9.6×", note: "Target 4.0×", tone: "success" },
    { label: "Conversions", value: "3,210", note: "+12.1% in 30 days" },
    { label: "Creator reach", value: "1.2M", note: "Across 3 platforms" },
  ],
  agency: [
    { label: "Managed brands", value: "0", note: "Invite your first brand" },
    { label: "Portfolio revenue", value: "$0", note: "No campaigns yet" },
    { label: "Active campaigns", value: "0", note: "Across all clients" },
    { label: "Approval SLA", value: "—", note: "Awaiting activity" },
  ],
  member: [
    { label: "Assigned to me", value: "7", note: "3 due today", tone: "warning" },
    { label: "Awaiting review", value: "4", note: "Content and imagery" },
    { label: "Completed", value: "18", note: "This month", tone: "success" },
    { label: "Team momentum", value: "92%", note: "On-time delivery", tone: "success" },
  ],
};

// ======================================================
// Shared sub-components
// ======================================================

function StatStrip({
  role,
  analytics,
}: {
  role: WorkspaceKey;
  analytics?: BrandAnalytics | null;
}) {
  const stats: Stat[] =
    role === "owner" && analytics
      ? [
          {
            label: "Total spend",
            value: `${analytics.currency || "PKR"} ${(
              (analytics.summary as any).totalSpend ?? 0
            ).toLocaleString()}`,
            note: `${analytics.campaignCount} campaign${analytics.campaignCount === 1 ? "" : "s"} created`,
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
              ((analytics as any).pendingApprovals ?? 0) > 0 ? "warning" : undefined,
          },
        ]
      : roleStats[role];

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

const loop = [
  "Product",
  "Understand",
  "Match",
  "Create",
  "Launch",
  "Measure",
  "Learn",
  "Optimize",
];

function ProductLoop() {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex min-w-[720px] items-center">
        {loop.map((step, index) => (
          <div key={step} className="contents">
            <div className="flex items-center gap-2">
              <span
                className={`grid size-6 place-items-center rounded-full text-[10px] font-semibold ${
                  index < 5
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase ${
                  index < 5 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            </div>
            {index < loop.length - 1 ? (
              <span className="mx-3 h-px min-w-4 flex-1 bg-border" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendPanel({
  title,
  description,
  series = [],
}: {
  title: string;
  description: string;
  series?: Array<{ day: string; revenue: number; conversions: number }>;
}) {
  const hasData = Array.isArray(series) && series.length > 0;

  return (
    <Panel>
      <SectionTitle
        title={title}
        description={description}
        action={<span className="text-xs text-muted-foreground">Last 6 weeks</span>}
      />
      <div className="h-56 w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No revenue data yet — launch a campaign to see performance.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 12 }}>
              <defs>
                <linearGradient id="roleTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  color: "var(--color-foreground)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#roleTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function Risk({ label, meta, level }: { label: string; meta: string; level: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <ShieldCheck className="size-4 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <StatusPill status={level} />
    </div>
  );
}

function Task({
  icon: Icon,
  title,
  meta,
  status,
}: {
  icon: typeof Clock3;
  title: string;
  meta: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-soft text-accent">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

function Update({ name, action, time }: { name: string; action: string; time: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs text-accent">
        {name.slice(0, 1)}
      </span>
      <p className="min-w-0 flex-1 leading-5">
        <strong className="font-medium">{name}</strong> {action}
        <span className="block text-xs text-muted-foreground">{time} ago</span>
      </p>
    </div>
  );
}

// ======================================================
// Admin
// ======================================================

function AdminWorkspace() {
  const systems = [
    ["Identity & access", "Operational", "8,420 active users"],
    ["Fashion intelligence", "Operational", "v1.2 · 91% eval"],
    ["Generation pipeline", "Monitoring", "2.8s p95 latency"],
    ["Creator graph", "Operational", "14.8M profiles"],
  ];
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <Panel>
        <SectionTitle
          title="Platform systems"
          description="Live operational and model governance status."
          action={
            <Button variant="outline" size="sm">
              Export audit
            </Button>
          }
        />
        <div className="divide-y divide-border">
          {systems.map(([name, status, detail]) => (
            <div
              key={name}
              className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 sm:grid-cols-[1fr_140px_180px]"
            >
              <span className="text-sm font-medium">{name}</span>
              <span
                className={
                  status === "Operational"
                    ? "text-xs text-success"
                    : "text-xs text-warning"
                }
              >
                {status}
              </span>
              <span className="hidden text-right text-xs text-muted-foreground sm:block">
                {detail}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionTitle
          title="Trust & risk"
          description="Signals requiring operator attention."
        />
        <div className="space-y-3">
          <Risk label="Unusual token volume" meta="Atelier North · 12 min ago" level="Review" />
          <Risk label="Dataset consent expires" meta="Creator EU set · 3 days" level="Planned" />
          <Risk label="Evaluation drift" meta="No active alerts" level="Clear" />
        </div>
      </Panel>
    </div>
  );
}

// ======================================================
// Influencer
// ======================================================

function InfluencerWorkspace() {
  const [profile, setProfile] = useState<Influencer | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<PublicProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    influencersApi
      .getMe()
      .then((res) => setProfile(res.influencer))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
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
                Add your bio, social accounts, and categories so brands can
                discover you.
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/influencers/$slug" params={{ slug: profile.slug }}>
                Setup profile
              </Link>
            </Button>
          </div>
        </div>
      )}

      <section className="mt-6">
        <div className="rounded-xl border border-border bg-gradient-to-r from-purple-500/5 via-transparent to-transparent p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-purple-500/15 text-purple-500">
              <Camera className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">Need a photoshoot or video?</p>
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
            <Button asChild size="sm" variant={hasPricing ? "outline" : "default"}>
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
              Set per-platform rates (Instagram, TikTok, YouTube…) so brands can
              build custom offers.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(pricingTiers).map(([platform, tiers]: any) => (
              <div key={platform} className="rounded-lg border border-border bg-card p-4">
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
                  to="/products/$slug"
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
                    {p.category && <p className="text-xs text-accent">{p.category}</p>}
                    <h3 className="mt-1 font-display text-lg leading-snug">{p.name}</h3>
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
          <SectionTitle title="Deliverables" description="Your next committed actions." />
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
            title="Your profile"
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
    </>
  );
}

// ======================================================
// Agency
// ======================================================

function AgencyWorkspace() {
  const brands = [
    ["Lumen Atelier", "9 live campaigns", "$82.4K", "Healthy"],
    ["Maison Nura", "4 awaiting approval", "$61.2K", "Attention"],
    ["Serein", "6 live campaigns", "$48.9K", "Healthy"],
    ["North Form", "2 briefs overdue", "$34.1K", "At risk"],
  ];

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <Panel>
        <SectionTitle
          title="Client portfolio"
          description="Delivery and commercial health across managed brands."
          action={
            <Button variant="outline" size="sm">
              <Building2 /> Switch client
            </Button>
          }
        />
        <div className="divide-y divide-border">
          {brands.map(([name, activity, revenue, health]) => (
            <div
              key={name}
              className="grid grid-cols-[1fr_auto] items-center gap-3 py-4 sm:grid-cols-[1fr_180px_100px_90px]"
            >
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground sm:hidden">{activity}</p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {activity}
              </span>
              <span className="text-sm tabular-nums">{revenue}</span>
              <span
                className={
                  health === "Healthy"
                    ? "text-right text-xs text-success"
                    : "text-right text-xs text-warning"
                }
              >
                {health}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Approval queue"
          description="Items waiting on clients or your team."
        />
        <Task icon={FileCheck2} title="8 content drafts" meta="Across 3 brands" status="Client" />
        <Task icon={WandSparkles} title="12 AI images" meta="Maison Nura · AW26" status="Internal" />
        <Task icon={Megaphone} title="Campaign brief" meta="North Form · 6h overdue" status="Late" />
      </Panel>

      <TrendPanel
        title="Portfolio performance"
        description="Attributed revenue across all managed clients."
      />

      <Panel>
        <SectionTitle
          title="Team capacity"
          description="Delivery load for the next seven days."
        />
        {[
          ["Creator strategy", 84],
          ["Content production", 68],
          ["Client approvals", 92],
          ["Analytics", 46],
        ].map(([label, value]) => (
          <div key={String(label)} className="mb-4">
            <div className="mb-2 flex justify-between text-xs">
              <span>{label}</span>
              <span className="text-muted-foreground">{value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ======================================================
// Member
// ======================================================

function MemberWorkspace() {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel>
        <SectionTitle
          title="Assigned to me"
          description="Prioritized by deadline and campaign impact."
          action={
            <Button size="sm">
              <CheckCircle2 />
              Mark progress
            </Button>
          }
        />
        <div className="divide-y divide-border">
          <Task icon={WandSparkles} title="Review six generated captions" meta="Noir Evening Edit · Due 11:30" status="High" />
          <Task icon={FileCheck2} title="Prepare creator brief" meta="Luna Accessories · Due 14:00" status="Today" />
          <Task icon={Layers3} title="Tag Maison Coat attributes" meta="Product intelligence · Due tomorrow" status="Normal" />
          <Task icon={UsersRound} title="Shortlist three creators" meta="Autumn Atelier · Due Friday" status="Normal" />
        </div>
      </Panel>
      <Panel>
        <SectionTitle title="Team pulse" description="What changed since your last visit." />
        <div className="space-y-4 text-sm">
          <Update name="Sara" action="approved the Luna creative direction" time="18 min" />
          <Update name="AI Studio" action="generated 6 caption variations" time="1h" />
          <Update name="Ema" action="requested changes on two images" time="3h" />
        </div>
      </Panel>
      <Panel className="xl:col-span-2">
        <SectionTitle
          title="Campaign calendar"
          description="Your deliverables and review windows."
        />
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-5">
          {["Mon 14", "Tue 15", "Wed 16", "Thu 17", "Fri 18"].map((day, i) => (
            <div key={day} className="min-h-28 bg-background p-3">
              <p className="text-xs text-muted-foreground">{day}</p>
              {i < 4 ? (
                <div className="mt-4 rounded-md border border-border bg-card p-2 text-xs">
                  {["Caption review", "Creator brief", "Image approval", "Campaign QA"][i]}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ======================================================
// Brand Owner
// ======================================================

function BrandWorkspace({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <ProductLoop />

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

// ======================================================
// Main Dashboard
// ======================================================

function Dashboard() {
  const { user, loading } = useRole();
  const navigate = useNavigate();

  const [realProducts, setRealProducts] = useState<RealProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [brandAnalytics, setBrandAnalytics] = useState<BrandAnalytics | null>(null);

  // ✅ Guards against flash-of-wrong-dashboard during redirect
  const [redirectChecked, setRedirectChecked] = useState(false);

  // ------------------------------------------------------
  // Redirect check — decide BEFORE rendering anything
  // ------------------------------------------------------
  useEffect(() => {
    if (loading || !user) return;
    if (redirectChecked) return;

    let target: string | null = null;

    if (user.roles.includes("SUPER_ADMIN")) {
      target = "/admin";
    } else if (user.roles.includes("AGENCY")) {
      target = "/agency";
    } else {
      const isOnlyShopper =
        user.roles.includes("SHOPPER") &&
        user.roles.every((r) => r === "SHOPPER");

      if (isOnlyShopper) {
        target = "/";
      } else if (
        user.roles.some((r) =>
          ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
        ) &&
        !user.organizationId
      ) {
        // Brand user without organization — send to brand setup
        target = "/brands";
      }
    }

    if (target) {
      navigate({ to: target as any, replace: true });
      // Keep redirectChecked = false → loader stays until navigation
    } else {
      setRedirectChecked(true);
    }
  }, [user, loading, navigate, redirectChecked]);

  // ------------------------------------------------------
  // Fetch products — only after redirect check passed
  // ------------------------------------------------------
  useEffect(() => {
    if (!redirectChecked || !user) return;

    const isBrandUser = user.roles.some((r) =>
      ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
    );
    if (!isBrandUser) return;

    setProductsLoading(true);
    productsApi
      .list()
      .then((res) => setRealProducts(res.products))
      .catch(() => setRealProducts([]))
      .finally(() => setProductsLoading(false));
  }, [redirectChecked, user]);

  // ------------------------------------------------------
  // Fetch analytics — only after redirect check passed
  // ------------------------------------------------------
  useEffect(() => {
    if (!redirectChecked || !user) return;

    const isBrandUser = user.roles.some((r) =>
      ["BRAND_OWNER", "BRAND_TEAM_MEMBER"].includes(r)
    );
    if (!isBrandUser) return;

    analyticsApi
      .brand()
      .then(setBrandAnalytics)
      .catch(() => setBrandAnalytics(null));
  }, [redirectChecked, user]);

  // ------------------------------------------------------
  // Render — loader until we know this user belongs here
  // ------------------------------------------------------
  if (loading || !user || !redirectChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  const workspace = pickWorkspace(user.roles);
  const copy = roleCopy[workspace];

  return (
    <>
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          workspace === "admin" ? (
            <Button>
              <ShieldCheck />
              Run health check
            </Button>
          ) : workspace === "influencer" ? (
            <Button>
              <BadgeDollarSign />
              View earnings
            </Button>
          ) : workspace === "member" ? (
            <Button>
              <Plus />
              New draft
            </Button>
          ) : (
            <Button asChild>
              <Link to="/matching">
                <Sparkles />
                Create with AI
              </Link>
            </Button>
          )
        }
      />

      {workspace !== "influencer" && (
        <StatStrip role={workspace} analytics={brandAnalytics} />
      )}
      {workspace === "admin" && <AdminWorkspace />}
      {workspace === "influencer" && <InfluencerWorkspace />}
      {workspace === "owner" && (
        <BrandWorkspace
          products={realProducts}
          loading={productsLoading}
          analytics={brandAnalytics}
        />
      )}
      {workspace === "agency" && <AgencyWorkspace />}
      {workspace === "member" && <MemberWorkspace />}
    </>
  );
}