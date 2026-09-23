import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { PageHeader, StatusPill } from "@/components/ui-kit";
import { campaigns } from "@/lib/styleai-data";

export const Route = createFileRoute("/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaigns — StyleAI" },
      { name: "description", content: "Every creator campaign with budget, reach, conversions, revenue, and ROI." },
      { property: "og:title", content: "Campaigns — StyleAI" },
      { property: "og:description", content: "Campaign orchestration for fashion brands." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Campaigns,
});

function Campaigns() {
  return (
    <AppShell breadcrumb={["Marketing", "Campaigns"]}>
      <PageHeader
        eyebrow="Marketing"
        title="Campaigns"
        description="Turn a product into a campaign in seven guided steps, or let StyleAI draft it first."
        actions={<Button><Plus />New campaign</Button>}
      />
      <ol className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {["01 Product", "02 Objective", "03 Audience", "04 Influencers", "05 Content", "06 Budget", "07 Review"].map((s) => (
          <li key={s} className="rounded-md border border-border bg-card px-3 py-1.5">{s}</li>
        ))}
      </ol>

      <section className="mt-8 space-y-5">
        {campaigns.map((c) => (
          <article key={c.slug} className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[96px_minmax(0,1fr)]">
            <img src={c.image} alt={c.name} width={900} height={1200} loading="lazy" className="hidden h-32 w-24 rounded-md object-cover sm:block" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-medium">{c.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{c.objective} · {c.window} · Budget {c.budget}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={c.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link to="/campaigns/$slug" params={{ slug: c.slug }}>Open</Link>
                  </Button>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                {[
                  ["Creators", String(c.influencers)],
                  ["Posts", String(c.posts)],
                  ["Reach", c.reach],
                  ["Conversions", c.conversions],
                  ["Revenue", c.revenue],
                  ["ROI", c.roi],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] text-muted-foreground">{k}</dt>
                    <dd className="text-sm font-medium tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
