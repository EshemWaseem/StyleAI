// components/dashboard/trend-panel.tsx
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { Panel, SectionTitle } from "@/components/ui-kit";

export function TrendPanel({
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