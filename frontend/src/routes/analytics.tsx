import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { MetricCard, PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { channelSeries, revenueSeries } from "@/lib/styleai-data";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — StyleAI" },
      { name: "description", content: "Revenue, ROI, conversions, and creator performance across your fashion campaigns." },
      { property: "og:title", content: "Analytics — StyleAI" },
      { property: "og:description", content: "Marketing intelligence for fashion brands." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  return (
    <AppShell breadcrumb={["Marketing", "Analytics"]}>
      <PageHeader
        eyebrow="Marketing"
        title="Analytics"
        description="What performed, why it performed, and where to move budget next."
        actions={
          <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
            {["7d", "30d", "90d", "Custom"].map((r, i) => (
              <button key={r} className={i === 1 ? "rounded bg-foreground px-2.5 py-1 text-background" : "px-2.5 py-1 text-muted-foreground"}>
                {r}
              </button>
            ))}
          </div>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value="$67,840" delta="21.3%" />
        <MetricCard label="ROI" value="8.4×" delta="0.9×" />
        <MetricCard label="Conversions" value="4,352" delta="9.8%" />
        <MetricCard label="Cost per conversion" value="$4.62" delta="7.1%" trend="down" note="lower is better" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="Revenue trend" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12, background: "var(--color-card)" }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2} fill="url(#rev2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Revenue by channel" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelSeries} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="channel" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 12, background: "var(--color-card)" }} />
                <Bar dataKey="revenue" fill="var(--color-foreground)" radius={[4, 4, 0, 0]} barSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
