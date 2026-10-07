// campaigns.index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { campaignsApi, type Campaign } from "@/lib/campaigns";

export const Route = createFileRoute("/campaigns/")({
  head: () => ({ meta: [{ title: "Campaigns — StyleAI" }] }),
  component: CampaignsListPage,
});

function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params: { status?: string; limit: number } = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const r = await campaignsApi.list(params);
      setCampaigns(Array.isArray(r?.campaigns) ? r.campaigns : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  return (
    <ProtectedRoute>
      <PageHeader
        eyebrow="Marketing"
        title="Campaigns"
        description="Live campaigns created from accepted offers. Track deliverables and progress."
        actions={
          <Button asChild>
            <Link to="/offers/new">
              <Plus className="mr-1.5 size-4" /> Create offer
            </Link>
          </Button>
        }
      />

      <div className="mt-6 flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_REVIEW">In review</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="DISPUTED">Disputed</option>
          {/* New shipping flow statuses */}
          <option value="AWAITING_ADDRESS">Awaiting address</option>
          <option value="ADDRESS_SUBMITTED">Address submitted</option>
          <option value="SHIPPED">Shipped</option>
          <option value="IN_PRODUCTION">In production</option>
        </select>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading campaigns…</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
          <Megaphone className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No campaigns yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Campaigns appear automatically when an offer is accepted by the influencer.
          </p>
          <Button asChild className="mt-4">
            <Link to="/offers/new">
              <Plus className="mr-1 size-4" /> Create offer
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}
    </ProtectedRoute>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const total = campaign.deliverables?.length ?? 0;
  const approved = (campaign.deliverables ?? []).filter((d) =>
    ["APPROVED", "BRAND_APPROVED", "PUBLISHED", "METRICS_ENTERED", "COMPLETED"].includes(d.status)
  ).length;
  const progress = total > 0 ? (approved / total) * 100 : 0;
  const daysLeft = campaign.dueDate
    ? Math.max(0, Math.ceil((new Date(campaign.dueDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Link
      to="/campaigns/$id"
      params={{ id: campaign.id }}
      className="group rounded-xl border border-border bg-card transition-shadow hover:shadow-lift"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg leading-tight truncate">{campaign.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {campaign.brand?.name} · {campaign.influencer?.displayName}
            </p>
          </div>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums">{approved}/{total} approved</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">
            {campaign.currency} {campaign.totalAmount.toFixed(2)}
          </span>
          {daysLeft !== null && (
            <span>{daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Past due"}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    // Shipping flow (new)
    AWAITING_ADDRESS: "bg-amber-500/15 text-amber-500",
    ADDRESS_SUBMITTED: "bg-amber-500/15 text-amber-500",
    SHIPPED: "bg-purple-500/15 text-purple-500",
    IN_PRODUCTION: "bg-blue-500/15 text-blue-500",
    // Legacy
    ACTIVE: "bg-blue-500/15 text-blue-500",
    IN_REVIEW: "bg-amber-500/15 text-amber-500",
    DELIVERED: "bg-purple-500/15 text-purple-500",
    COMPLETED: "bg-emerald-500/15 text-emerald-500",
    CANCELLED: "bg-muted text-muted-foreground",
    DISPUTED: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
        styles[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}