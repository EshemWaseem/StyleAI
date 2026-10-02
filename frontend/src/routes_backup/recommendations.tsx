// routes/recommendations.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { InsightCard, PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { recommendationsApi, type Recommendation } from "@/lib/recommendations";

export const Route = createFileRoute("/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations — StyleAI" }] }),
  component: Recommendations,
});

function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<{ generatedAt: string; cached: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await recommendationsApi.list();
      setRecs(res.recommendations || []);
      setMeta({ generatedAt: res.generatedAt, cached: res.cached });
    } catch (e: any) {
      setError(e?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ProtectedRoute>
      <AppShell breadcrumb={["Intelligence", "Recommendations"]}>
        <PageHeader
          eyebrow="Intelligence"
          title="Recommendations"
          description="Learned from your own campaign results. Every suggestion shows its reasoning and confidence."
          actions={
            <Button variant="outline" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={`mr-1.5 size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
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
            <span className="text-sm text-muted-foreground">Analysing your data…</span>
          </div>
        ) : recs.length === 0 ? (
          <Panel className="mt-8">
            <div className="flex flex-col items-center py-12 text-center">
              <Sparkles className="size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No recommendations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Run a campaign or complete an offer to start receiving AI-driven suggestions.
              </p>
            </div>
          </Panel>
        ) : (
          <>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {recs.map((r) => (
                <InsightCard
                  key={r.id}
                  title={r.title}
                  reason={r.reason}
                  confidence={r.confidence}
                  action={r.action}
                  link={r.link}
                />
              ))}
            </div>

            {meta && (
              <p className="mt-6 text-center text-[10px] text-muted-foreground">
                Generated {new Date(meta.generatedAt).toLocaleString()}
                {meta.cached ? " · cached" : " · live"}
              </p>
            )}
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}