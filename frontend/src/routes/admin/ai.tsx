// frontend/src/routes/admin/ai.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Cpu, DollarSign, Zap, Activity,
  CheckCircle2, XCircle,
} from "lucide-react";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adminApi } from "@/lib/admin";
import type { AIModel, AIUsageStats, AITimelinePoint, AIUsageRow } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "AI · Model Management — StyleAI" }] }),
  component: AdminAIPage,
});

function AdminAIPage() {
  const [stats, setStats] = useState<AIUsageStats | null>(null);
  const [timeline, setTimeline] = useState<AITimelinePoint[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [recent, setRecent] = useState<AIUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, t, m, r] = await Promise.all([
        adminApi.getAIStats(24),
        adminApi.getAITimeline(7),
        adminApi.listAIModels(),
        adminApi.listAIUsage({ limit: 20 }),
      ]);
      setStats(s.stats);
      setTimeline(t.timeline);
      setModels(m.models);
      setRecent(r.usages);
    } catch (e: any) {
      setError(e?.message || "Failed to load AI data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Super admin"
          title="AI operations"
          description="Model registry, usage, cost, and health across every AI provider."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading AI data…</span>
          </div>
        ) : stats ? (
          <>
            {/* ========== KPI CARDS ========== */}
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Activity}
                label="Calls (24h)"
                value={stats.totalCalls.toLocaleString()}
                note={`${stats.successCalls} ok · ${stats.errorCalls} err`}
              />
              <KpiCard
                icon={CheckCircle2}
                label="Success rate"
                value={`${stats.successRate}%`}
                note={stats.successRate > 95 ? "Healthy" : "Check errors"}
              />
              <KpiCard
                icon={Zap}
                label="Avg latency"
                value={`${stats.avgLatencyMs}ms`}
                note="Across all providers"
              />
              <KpiCard
                icon={DollarSign}
                label="Cost (24h)"
                value={`$${stats.totalCost.toFixed(4)}`}
                note={`${stats.totalTokens.toLocaleString()} tokens`}
              />
            </section>

            {/* ========== PROVIDER BREAKDOWN ========== */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(stats.byProvider).map(([provider, data]) => (
                <Panel key={provider} className="p-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4 text-accent" />
                    <p className="text-sm font-medium capitalize">{provider}</p>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Calls</span>
                      <span className="font-medium text-foreground">{data.calls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost</span>
                      <span className="font-medium text-foreground">${data.cost.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tokens</span>
                      <span className="font-medium text-foreground">{data.tokens.toLocaleString()}</span>
                    </div>
                    {data.errors > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Errors</span>
                        <span className="font-medium">{data.errors}</span>
                      </div>
                    )}
                  </div>
                </Panel>
              ))}
              {Object.keys(stats.byProvider).length === 0 && (
                <Panel className="col-span-full p-6 text-center text-sm text-muted-foreground">
                  No usage recorded yet.
                </Panel>
              )}
            </section>

            {/* ========== TIMELINE ========== */}
            <section className="mt-6">
              <Panel>
                <SectionTitle
                  title="Usage timeline"
                  description="Last 7 days"
                />
                <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
                  {timeline.map((d) => {
                    const max = Math.max(...timeline.map((x) => x.calls), 1);
                    const h = Math.max(4, (d.calls / max) * 100);
                    return (
                      <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-accent/60"
                          style={{ height: `${h}%` }}
                          title={`${d.calls} calls · $${d.cost.toFixed(4)}`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                  {timeline.length === 0 && (
                    <p className="w-full text-center text-xs text-muted-foreground">
                      No data yet
                    </p>
                  )}
                </div>
              </Panel>
            </section>

            {/* ========== MODEL REGISTRY ========== */}
            <section className="mt-6">
              <Panel className="overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-medium">Model registry ({models.length})</h3>
                </div>
                {models.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No models registered. Run <code className="rounded bg-muted px-1">node src/scripts/seedAIModels.js</code> to seed defaults.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="p-3 font-medium">Model</th>
                          <th className="p-3 font-medium">Provider</th>
                          <th className="p-3 font-medium">Task</th>
                          <th className="p-3 font-medium">Version</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium text-right">Cost / 1K</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {models.map((m) => (
                          <tr key={m.id}>
                            <td className="p-3">
                              <p className="font-medium">{m.displayName}</p>
                              <p className="text-xs text-muted-foreground">{m.name}</p>
                            </td>
                            <td className="p-3 capitalize">{m.provider}</td>
                            <td className="p-3 uppercase text-xs">{m.taskType}</td>
                            <td className="p-3 text-xs">v{m.version}</td>
                            <td className="p-3"><StatusBadge status={m.status} /></td>
                            <td className="p-3 text-right tabular-nums text-xs">
                              {m.costPerCall != null
                                ? `$${m.costPerCall.toFixed(4)}/call`
                                : m.costPer1kInput != null && m.costPer1kInput > 0
                                ? `$${m.costPer1kInput}/1K`
                                : "Free"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </section>

            {/* ========== RECENT CALLS ========== */}
            <section className="mt-6">
              <Panel className="overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-medium">Recent calls</h3>
                </div>
                {recent.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No calls yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="p-3 font-medium">Model</th>
                          <th className="p-3 font-medium">Task</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium text-right">Latency</th>
                          <th className="p-3 font-medium text-right">Tokens</th>
                          <th className="p-3 font-medium text-right">Cost</th>
                          <th className="p-3 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recent.map((r) => (
                          <tr key={r.id}>
                            <td className="p-3">
                              <p className="text-xs font-medium">{r.modelName}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{r.provider}</p>
                            </td>
                            <td className="p-3 text-xs uppercase">{r.taskType}</td>
                            <td className="p-3">
                              {r.status === "SUCCESS" ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                                  <CheckCircle2 className="size-3" /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                  <XCircle className="size-3" /> {r.status}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums text-xs">
                              {r.latencyMs != null ? `${r.latencyMs}ms` : "—"}
                            </td>
                            <td className="p-3 text-right tabular-nums text-xs">
                              {r.totalTokens.toLocaleString()}
                            </td>
                            <td className="p-3 text-right tabular-nums text-xs">
                              ${r.cost.toFixed(6)}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </section>
          </>
        ) : null}
      </>
    </ProtectedRoute>
  );
}

function KpiCard({
  icon: Icon, label, value, note,
}: { icon: any; label: string; value: string; note: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-accent/15 text-accent">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PRODUCTION: "bg-emerald-500/15 text-emerald-500",
    STAGING: "bg-amber-500/15 text-amber-500",
    DEPRECATED: "bg-muted text-muted-foreground",
    DISABLED: "bg-destructive/15 text-destructive",
  };
  const cls = map[status] || map.DISABLED;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {status}
    </span>
  );
}