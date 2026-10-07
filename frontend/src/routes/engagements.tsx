// routes/engagements.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Send, Clock, CheckCircle2, Sparkles,
  FileImage, X, Upload, Package,
} from "lucide-react";
import { useRealtimeEvent } from "@/lib/websocket/hooks";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { agencyApi } from "@/lib/agency";
import { campaignsApi, type Campaign, type Deliverable } from "@/lib/campaigns";
import type { AgencyEngagement, AgencyEngagementStatus } from "@/lib/agency/types";
import {
  AGENCY_SERVICE_LABELS,
  ENGAGEMENT_STATUS_LABELS,
} from "@/lib/agency/types";

export const Route = createFileRoute("/engagements")({
  head: () => ({ meta: [{ title: "My engagements — StyleAI" }] }),
  component: MyEngagementsPage,
});

function MyEngagementsPage() {
  const [engagements, setEngagements] = useState<AgencyEngagement[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [forwardTarget, setForwardTarget] = useState<AgencyEngagement | null>(null);

  async function refresh() {
    try {
      const res = await agencyApi.listMyEngagements({
        status: statusFilter || undefined,
        limit: 100,
      });
      setEngagements(res.engagements || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    }
  }

  async function initialLoad() {
    setInitialLoading(true);
    setError("");
    await refresh();
    setInitialLoading(false);
  }

  useEffect(() => {
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // ✅ Real-time: silent refresh on engagement events (no full spinner)
  useRealtimeEvent("engagement:updated", () => refresh());
  useRealtimeEvent("engagement:created", () => refresh());

  const pending = engagements.filter((e) => e.status === "PENDING").length;
  const active = engagements.filter((e) =>
    ["ACCEPTED", "IN_PROGRESS", "DELIVERED"].includes(e.status)
  ).length;

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow="Discover"
          title="My engagements"
          description="Agencies you've hired for photoshoots, videography, and more."
          actions={
            <Link
              to="/agency/browse"
              className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="size-3.5" /> Browse agencies
            </Link>
          }
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniStat icon={Send} label="Pending" value={pending} accent="amber" />
          <MiniStat icon={Clock} label="Active" value={active} accent="blue" />
          <MiniStat icon={CheckCircle2} label="Total" value={engagements.length} accent="emerald" />
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: "", label: "All" },
            { key: "PENDING", label: "Pending" },
            { key: "ACCEPTED", label: "Accepted" },
            { key: "IN_PROGRESS", label: "In progress" },
            { key: "DELIVERED", label: "Delivered" },
            { key: "COMPLETED", label: "Completed" },
            { key: "CANCELLED", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                statusFilter === f.key
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {initialLoading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : engagements.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Send className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No engagements yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hire an agency to get started.
            </p>
            <Link
              to="/agency/browse"
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="size-3.5" /> Browse agencies
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {engagements.map((e) => (
              <EngagementRow
                key={e.id}
                e={e}
                onForward={() => setForwardTarget(e)}
              />
            ))}
          </div>
        )}

        {forwardTarget && (
          <ForwardToCampaignModal
            engagement={forwardTarget}
            onClose={() => setForwardTarget(null)}
            onForwarded={() => { setForwardTarget(null); refresh(); }}
          />
        )}
      </>
    </ProtectedRoute>
  );
}

function EngagementRow({
  e, onForward,
}: {
  e: AgencyEngagement;
  onForward: () => void;
}) {
  const files = Array.isArray(e.deliverableFiles) ? e.deliverableFiles : [];
  const canForward = e.status === "DELIVERED" && files.length > 0;

  return (
    <Panel className="overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-xs font-semibold uppercase text-accent">
            {(e.agencyOrganization?.name || "AG").slice(0, 3)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{e.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {e.agencyOrganization?.name || "Agency"} ·{" "}
              {AGENCY_SERVICE_LABELS[e.serviceType]} ·{" "}
              {e.currency} {e.budget.toLocaleString()}
            </p>
          </div>
        </div>
        <StatusBadge status={e.status} />
      </div>

      {files.length > 0 && (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Agency delivered {files.length} file{files.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {files.slice(0, 5).map((f: any, i: number) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="block size-14 overflow-hidden rounded-md border border-border bg-muted"
                title={f.name || `File ${i + 1}`}
              >
                {f.type === "image" || !f.type ? (
                  <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <FileImage className="size-4 text-muted-foreground" />
                  </div>
                )}
              </a>
            ))}
            {files.length > 5 && (
              <div className="grid size-14 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                +{files.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {canForward && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={onForward}>
            <Upload className="mr-1.5 size-3.5" /> Send to campaign
          </Button>
        </div>
      )}
    </Panel>
  );
}

function StatusBadge({ status }: { status: AgencyEngagementStatus }) {
  const styles: Record<AgencyEngagementStatus, string> = {
    PENDING: "bg-amber-500/15 text-amber-500",
    ACCEPTED: "bg-blue-500/15 text-blue-500",
    IN_PROGRESS: "bg-purple-500/15 text-purple-500",
    DELIVERED: "bg-emerald-500/15 text-emerald-500",
    COMPLETED: "bg-emerald-500/15 text-emerald-500",
    CANCELLED: "bg-destructive/15 text-destructive",
    DISPUTED: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${styles[status]}`}>
      {ENGAGEMENT_STATUS_LABELS[status]}
    </span>
  );
}

// ======================================================
// Forward to Campaign Modal
// ======================================================
function ForwardToCampaignModal({
  engagement, onClose, onForwarded,
}: {
  engagement: AgencyEngagement;
  onClose: () => void;
  onForwarded: () => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    campaignsApi
      .list({ limit: 100 })
      .then((r) => setCampaigns(r.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const deliverables = selectedCampaign?.deliverables ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedCampaignId) { setError("Select a campaign"); return; }
    if (!selectedDeliverableId) { setError("Select a deliverable"); return; }
    setSubmitting(true);
    try {
      await agencyApi.linkToCampaign(engagement.id, {
        campaignId: selectedCampaignId,
        deliverableId: selectedDeliverableId,
      });
      onForwarded();
    } catch (err: any) {
      setError(err?.message || "Failed to send");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-lg rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-medium">Send content to campaign</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Agency's edited files will be submitted as final to the campaign.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={submitting}>
            <X />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              You have no active campaigns. Accept a brand offer first.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Select campaign
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => {
                    setSelectedCampaignId(e.target.value);
                    setSelectedDeliverableId("");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={submitting}
                >
                  <option value="">— Choose campaign —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} · {c.brand?.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCampaignId && (
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Select deliverable
                  </label>
                  {deliverables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      This campaign has no deliverables yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {deliverables.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDeliverableId(d.id)}
                          disabled={submitting}
                          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                            selectedDeliverableId === d.id
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <span>
                            <span className="font-medium capitalize">
                              {d.contentType} × {d.quantity}
                            </span>
                            <span className="ml-2 text-muted-foreground uppercase">
                              {d.platform}
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {d.status.replace(/_/g, " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !selectedCampaignId || !selectedDeliverableId}>
            {submitting ? (
              <><Loader2 className="mr-1.5 size-4 animate-spin" /> Sending…</>
            ) : (
              <><Package className="mr-1.5 size-4" /> Send to campaign</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, accent,
}: {
  icon: any;
  label: string;
  value: number;
  accent: "amber" | "blue" | "emerald";
}) {
  const colors = {
    amber: "bg-amber-500/15 text-amber-500",
    blue: "bg-blue-500/15 text-blue-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md ${colors[accent]}`}>
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-2xl font-medium tabular-nums">{value}</p>
    </div>
  );
}