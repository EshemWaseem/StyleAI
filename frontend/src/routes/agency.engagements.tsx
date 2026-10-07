// routes/agency.engagements.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useRealtimeEvent } from "@/lib/websocket/hooks";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Inbox, Check, X, Play, CheckCircle2,
  Clock, Upload, PackageCheck, FileImage, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FileUploader } from "@/components/upload/FileUploader";
import type { UploadedFile } from "@/lib/upload/api";
import { agencyApi } from "@/lib/agency";
import type { AgencyEngagement, AgencyEngagementStatus } from "@/lib/agency/types";
import {
  AGENCY_SERVICE_LABELS,
  ENGAGEMENT_STATUS_LABELS,
} from "@/lib/agency/types";

export const Route = createFileRoute("/agency/engagements")({
  head: () => ({ meta: [{ title: "Agency · Engagements — StyleAI" }] }),
  component: AgencyEngagementsPage,
});

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

function AgencyEngagementsPage() {
  const [engagements, setEngagements] = useState<AgencyEngagement[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AgencyEngagement | null>(null);
  const [deliverTarget, setDeliverTarget] = useState<AgencyEngagement | null>(null);

  // Silent refresh — no full-page spinner
  async function refresh() {
    try {
      const res = await agencyApi.listAgencyInbox({
        status: statusFilter || undefined,
        limit: 100,
      });
      setEngagements(res.engagements || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load engagements");
    }
  }

  // Initial load with full spinner
  async function initialLoad() {
    setInitialLoading(true);
    setError("");
    await refresh();
    setInitialLoading(false);
  }

  useEffect(() => { initialLoad(); /* eslint-disable-next-line */ }, [statusFilter]);

    //  Real-time: refetch when any engagement changes
  useRealtimeEvent("engagement:created", () => refresh());
  useRealtimeEvent("engagement:updated", () => refresh());

  async function doAction(id: string, fn: () => Promise<any>) {
    setActionId(id);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Action failed");
    } finally {
      setActionId(null);
    }
  }

  const pending = engagements.filter((e) => e.status === "PENDING").length;
  const active = engagements.filter((e) =>
    ["ACCEPTED", "IN_PROGRESS", "DELIVERED"].includes(e.status)
  ).length;

  return (
    <ProtectedRoute roles={["AGENCY", "SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Agency"
          title="Engagements"
          description="Hire requests from brands and influencers — track and deliver."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniStat icon={Inbox} label="Pending" value={pending} accent="amber" />
          <MiniStat icon={Clock} label="Active" value={active} accent="blue" />
          <MiniStat icon={CheckCircle2} label="Total" value={engagements.length} accent="emerald" />
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
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
            <Inbox className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No engagements yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hire requests from brands and influencers will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {engagements.map((e) => (
              <EngagementCard
                key={e.id}
                engagement={e}
                busy={actionId === e.id}
                onAccept={() => doAction(e.id, () => agencyApi.acceptEngagement(e.id))}
                onReject={() => setRejectTarget(e)}
                onStart={() => doAction(e.id, () => agencyApi.startEngagement(e.id))}
                onDeliver={() => setDeliverTarget(e)}
                onComplete={() => doAction(e.id, () => agencyApi.completeEngagement(e.id))}
              />
            ))}
          </div>
        )}

        {rejectTarget && (
          <RejectEngagementModal
            engagement={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onRejected={() => { setRejectTarget(null); refresh(); }}
          />
        )}

        {deliverTarget && (
          <DeliverModal
            engagement={deliverTarget}
            onClose={() => setDeliverTarget(null)}
            onDelivered={() => { setDeliverTarget(null); refresh(); }}
          />
        )}
      </>
    </ProtectedRoute>
  );
}

function EngagementCard({
  engagement, busy, onAccept, onReject, onStart, onDeliver, onComplete,
}: {
  engagement: AgencyEngagement;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onStart: () => void;
  onDeliver: () => void;
  onComplete: () => void;
}) {
  const statusStyles: Record<AgencyEngagementStatus, string> = {
    PENDING: "bg-amber-500/15 text-amber-500",
    ACCEPTED: "bg-blue-500/15 text-blue-500",
    IN_PROGRESS: "bg-purple-500/15 text-purple-500",
    DELIVERED: "bg-emerald-500/15 text-emerald-500",
    COMPLETED: "bg-emerald-500/15 text-emerald-500",
    CANCELLED: "bg-destructive/15 text-destructive",
    DISPUTED: "bg-destructive/15 text-destructive",
  };

  const files = Array.isArray(engagement.deliverableFiles)
    ? engagement.deliverableFiles
    : [];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-xs font-semibold uppercase text-accent">
            {engagement.clientType === "BRAND" ? "BRD" : "INF"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{engagement.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {AGENCY_SERVICE_LABELS[engagement.serviceType]} ·{" "}
              {engagement.currency} {engagement.budget.toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${statusStyles[engagement.status]}`}>
          {ENGAGEMENT_STATUS_LABELS[engagement.status]}
        </span>
      </div>

      {engagement.description && (
        <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground whitespace-pre-line">
          {engagement.description}
        </p>
      )}

      {/* Delivered files preview */}
      {files.length > 0 && (
        <div className="border-b border-border bg-emerald-500/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Delivered files ({files.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {files.slice(0, 6).map((f: any, i: number) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block size-16 overflow-hidden rounded-md border border-border bg-muted"
                title={f.name || `File ${i + 1}`}
              >
                {f.type === "image" || !f.type ? (
                  <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                    <FileImage className="size-5" />
                  </div>
                )}
              </a>
            ))}
            {files.length > 6 && (
              <div className="grid size-16 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                +{files.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
        <span>
          From: <span className="font-medium text-foreground">
            {engagement.clientType === "BRAND" ? "Brand" : "Influencer"}
          </span>
        </span>
        {engagement.deadline && (
          <>
            <span>·</span>
            <span>Deadline: {new Date(engagement.deadline).toLocaleDateString()}</span>
          </>
        )}
        <span>·</span>
        <span>Requested {new Date(engagement.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="flex flex-wrap gap-2 p-4">
        {engagement.status === "PENDING" && (
          <>
            <Button size="sm" onClick={onAccept} disabled={busy}>
              {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Check className="mr-1 size-3" />}
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
              <X className="mr-1 size-3" /> Decline
            </Button>
          </>
        )}

        {engagement.status === "ACCEPTED" && (
          <Button size="sm" onClick={onStart} disabled={busy}>
            {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Play className="mr-1 size-3" />}
            Start work
          </Button>
        )}

        {engagement.status === "IN_PROGRESS" && (
          <Button size="sm" onClick={onDeliver} disabled={busy}>
            <Upload className="mr-1 size-3" />
            Upload deliverable & mark delivered
          </Button>
        )}

        {engagement.status === "DELIVERED" && (
          <Button size="sm" variant="outline" onClick={onComplete} disabled={busy}>
            {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <CheckCircle2 className="mr-1 size-3" />}
            Mark complete
          </Button>
        )}

        {["COMPLETED", "CANCELLED"].includes(engagement.status) && (
          <p className="text-xs text-muted-foreground">
            {engagement.status === "COMPLETED"
              ? "✓ Completed — content delivered to client"
              : `Cancelled: ${engagement.cancelReason || "—"}`}
          </p>
        )}
      </div>
    </Panel>
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

// ======================================================
// DELIVER MODAL — Agency uploads files & marks delivered
// ======================================================
function DeliverModal({
  engagement, onClose, onDelivered,
}: {
  engagement: AgencyEngagement;
  onClose: () => void;
  onDelivered: () => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (files.length === 0) {
      setError("Upload at least one file");
      return;
    }
    setSaving(true);
    try {
      await agencyApi.uploadDeliverable(engagement.id, {
        files: files.map((f) => ({
          url: f.url,
          publicId: f.publicId,
          type: f.resourceType,
          name: f.originalName,
        })),
        notes: notes.trim() || undefined,
      });
      onDelivered();
    } catch (err: any) {
      setError(err?.message || "Failed");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-lg rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-medium">Deliver edited content</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload the final edited files for "{engagement.title}".
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            Client will receive these files. They can then forward to their campaign for brand review.
          </div>

          <FileUploader
            campaignId={engagement.id}
            deliverableId={engagement.id}
            onUploaded={setFiles}
          />

          <div>
            <Label htmlFor="notes">Notes for client (optional)</Label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the client should know about this delivery…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || files.length === 0}>
            {saving ? (
              <><Loader2 className="mr-1.5 size-4 animate-spin" /> Delivering…</>
            ) : (
              <><PackageCheck className="mr-1.5 size-4" /> Mark delivered</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ======================================================
// REJECT MODAL
// ======================================================
function RejectEngagementModal({
  engagement, onClose, onRejected,
}: {
  engagement: AgencyEngagement;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!reason.trim()) { setError("Reason is required"); return; }
    setSaving(true);
    try {
      await agencyApi.rejectEngagement(engagement.id, { reason: reason.trim() });
      onRejected();
    } catch (err: any) {
      setError(err?.message || "Failed");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-sm font-medium">Decline engagement</h3>
          <button onClick={onClose} disabled={saving} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you declining?"
              disabled={saving}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Declining…</> : "Decline"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}