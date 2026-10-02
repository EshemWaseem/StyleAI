// frontend/src/routes/agency.editing.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Camera, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { campaignsApi, type Campaign, type Deliverable } from "@/lib/campaigns";

export const Route = createFileRoute("/agency/editing")({
  head: () => ({ meta: [{ title: "Agency · Editing Queue — StyleAI" }] }),
  component: AgencyEditingPage,
});

interface QueueItem {
  campaign: Campaign;
  deliverable: Deliverable;
}

function AgencyEditingPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    campaignsApi.list({ limit: 200 })
      .then((r) => {
        const campaigns = Array.isArray(r?.campaigns) ? r.campaigns : [];
        const items: QueueItem[] = [];
        for (const c of campaigns) {
          for (const d of c.deliverables ?? []) {
            if (["RAW_UPLOADED", "AGENCY_EDITING"].includes(d.status)) {
              items.push({ campaign: c, deliverable: d });
            }
          }
        }
        setQueue(items);
      })
      .catch((e) => setError(e?.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute roles={["AGENCY"]}>
      <>
        <PageHeader
          eyebrow="Agency"
          title="Editing queue"
          description="Raw content waiting to be edited and finalized."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : queue.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Camera className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Nothing to edit right now.</p>
          </div>
        ) : (
          <Panel className="mt-6 divide-y divide-border">
            {queue.map(({ campaign, deliverable }, i) => (
              <div key={`${campaign.id}-${deliverable.id}`} className="flex items-center gap-3 p-4">
                <div className="grid size-10 place-items-center rounded-lg bg-purple-500/15 text-purple-500 text-xs font-semibold uppercase">
                  {deliverable.platform.slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{campaign.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.brand?.name} · {campaign.influencer?.displayName} · {deliverable.contentType} × {deliverable.quantity}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {deliverable.status.replace(/_/g, " ")}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/campaigns/$id" params={{ id: campaign.id }}>
                    Open <ChevronRight className="ml-1 size-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </Panel>
        )}
      </>
    </ProtectedRoute>
  );
}