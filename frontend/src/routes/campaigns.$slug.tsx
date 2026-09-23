import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pause, Pencil } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import {
  Eyebrow,
  InsightCard,
  Panel,
  SectionTitle,
  StatusPill,
} from "@/components/ui-kit";
import { campaignBySlug, channelSeries, insights } from "@/lib/styleai-data";

export const Route = createFileRoute("/campaigns/$slug")({
  head: ({ params }) => {
    const c = campaignBySlug(params.slug);
    return {
      meta: [
        { title: `${c.name} — StyleAI` },
        {
          name: "description",
          content: `Performance, creator roster, and AI recommendations for the ${c.name} campaign.`,
        },
        { property: "og:title", content: `${c.name} — StyleAI` },
        {
          property: "og:description",
          content: `${c.objective} · ${c.revenue} revenue · ${c.roi} ROI.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CampaignDetail,
});

function CampaignDetail() {
  const { slug } = Route.useParams();
  const c = campaignBySlug(slug);
  const insight = insights[0]!;

  return (
    <AppShell breadcrumb={["Campaigns", c.name]}>
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All campaigns
      </Link>

      <header className="mt-6 grid gap-4 border-b border-border pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Eyebrow>{c.objective}</Eyebrow>
            <StatusPill status={c.status} />
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {c.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {c.window} · {c.spent} of {c.budget} spent
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Pause />
            Pause
          </Button>
          <Button variant="outline">
            <Pencil />
            Edit
          </Button>
          <Button>View report</Button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Reach", c.reach],
          ["Impressions", c.impressions],
          ["Clicks", c.clicks],
          ["Conversions", c.conversions],
          ["Revenue", c.revenue],
          ["ROI", c.roi],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {k}
            </p>
            <p className="mt-2 font-display text-2xl font-medium tabular-nums">
              {v}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <SectionTitle
            title="Revenue by channel"
            description="Attributed revenue across creator platforms."
          />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={channelSeries}
                margin={{ left: -18, right: 6, top: 6 }}
              >
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="channel"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                    background: "var(--color-card)",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-foreground)"
                  radius={[4, 4, 0, 0]}
                  barSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <div className="grid gap-6">
          <InsightCard {...insight} />
          <Panel>
            <Eyebrow>Campaign forecast</Eyebrow>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ["Reach", "250K–400K"],
                ["Clicks", "8K–12K"],
                ["Conversion", "2.4–3.2%"],
                ["Revenue", "$8K–$13K"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              AI estimate — not guaranteed.
            </p>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6">
        <SectionTitle
          title="Creator roster"
          description="Influencers assigned to this campaign will appear here."
        />
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No influencers assigned to this campaign yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Once campaign workflows go live, you'll be able to add creators and
            track deliverables here.
          </p>
        </div>
      </Panel>
    </AppShell>
  );
}