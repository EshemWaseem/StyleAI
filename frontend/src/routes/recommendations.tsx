// routes/recommendations.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Sparkles, RefreshCw, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
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

  useEffect(() => {
    load();
  }, []);

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow="Intelligence"
          title="Recommendations"
          description="Learned from your own campaign results. Every suggestion shows its reasoning and confidence."
          actions={
            <Button
              variant="outline"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-1.5 size-4 ${refreshing ? "animate-spin" : ""}`}
              />
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
                <RecommendationCard key={r.id} rec={r} />
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
      </>
    </ProtectedRoute>
  );
}

// ======================================================
// RECOMMENDATION CARD — accent-green themed
// ======================================================
function RecommendationCard({ rec }: { rec: Recommendation }) {
  // Urgency tier — maps to theme colors
  const tier =
    rec.confidence >= 85
      ? {
          ring: "border-accent/40",
          pill: "bg-accent/15 text-accent",
          glow: "hover:shadow-[0_0_0_1px_var(--color-accent)]",
        }
      : rec.confidence >= 70
      ? {
          ring: "border-accent/25",
          pill: "bg-accent/10 text-accent",
          glow: "hover:shadow-md",
        }
      : {
          ring: "border-border",
          pill: "bg-muted text-muted-foreground",
          glow: "hover:shadow-sm",
        };

  return (
    <div
      className={`flex flex-col rounded-xl border bg-card p-5 transition-all ${tier.ring} ${tier.glow}`}
    >
      {/* Header row — Sparkles label + confidence pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="size-3" />
          StyleAI insight
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${tier.pill}`}
        >
          {rec.confidence}%
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-3 font-display text-lg font-medium leading-snug text-foreground">
        {rec.title}
      </h3>

      {/* Reason */}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {rec.reason}
      </p>

      {/* Action button */}
      <div className="mt-5">
        {rec.link ? (
          <Link
            to={rec.link as any}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {rec.action || "Open"}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {rec.action || "No action available"}
          </span>
        )}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        AI estimate, not guaranteed
      </p>
    </div>
  );
}