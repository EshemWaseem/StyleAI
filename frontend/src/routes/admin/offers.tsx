import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, FileText, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OfferStatusBadge } from "@/components/offers/OfferStatusBadge";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { offersApi } from "@/lib/offers";
import type { Offer } from "@/lib/offers";
import { swalError } from "@/lib/swal";

export const Route = createFileRoute("/admin/offers")({
  head: () => ({ meta: [{ title: "Admin · Offers — StyleAI" }] }),
  component: AdminOffersPage,
});

function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING_ADMIN");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params: { limit: number; status?: string } = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      const r = await offersApi.list(params);
      setOffers(Array.isArray(r?.offers) ? r.offers : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function approve(o: Offer) {
    setBusy(o.id);
    try {
      await offersApi.adminReview(o.id, { decision: "approve" });
      setOffers((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: "ADMIN_APPROVED" } : x))
      );
    } catch (e: any) {
      swalError(e?.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(o: Offer) {
    const note = prompt("Reason for rejection (optional):") || "";
    setBusy(o.id);
    try {
      await offersApi.adminReview(o.id, { decision: "reject", adminNote: note });
      setOffers((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: "ADMIN_REJECTED" } : x))
      );
    } catch (e: any) {
      swalError(e?.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Super admin"
          title="Custom offers"
          description="Review, approve, or reject custom offers submitted by brands. Rejecting refunds the brand's escrow."
        />

        <div className="mt-6 flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING_ADMIN">Pending review</option>
            <option value="ADMIN_APPROVED">Approved</option>
            <option value="ADMIN_REJECTED">Rejected</option>
            <option value="INFLUENCER_ACCEPTED">Influencer accepted</option>
            <option value="INFLUENCER_DECLINED">Influencer declined</option>
            <option value="DRAFT">Drafts</option>
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
            <span className="text-sm text-muted-foreground">Loading offers…</span>
          </div>
        ) : offers.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <FileText className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No offers in this state.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Brand</th>
                    <th className="p-3 font-medium">Influencer</th>
                    <th className="p-3 font-medium text-right">Items</th>
                    <th className="p-3 font-medium text-right">Total</th>
                    <th className="p-3 font-medium text-right">Admin fee</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offers.map((o) => (
                    <tr key={o.id} className={busy === o.id ? "opacity-50" : ""}>
                      <td className="p-3">
                        <Link
                          to="/offers/$id"
                          params={{ id: o.id }}
                          className="font-medium hover:underline"
                        >
                          {o.title || `Offer #${String(o.id).slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{o.brand?.name || "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {o.influencer?.displayName || "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {Array.isArray(o.items) ? o.items.length : 0}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {o.currency} {Number(o.total || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-emerald-500">
                        {o.currency} {Number(o.adminFee || 0).toFixed(2)}
                      </td>
                      <td className="p-3"><OfferStatusBadge status={o.status} /></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <TooltipIconButton label="Open in new tab" asChild>
                            <Link to="/offers/$id" params={{ id: o.id }} target="_blank">
                              <ExternalLink className="size-4" />
                            </Link>
                          </TooltipIconButton>
                          {o.status === "PENDING_ADMIN" && (
                            <>
                              <TooltipIconButton
                                label="Reject — refunds brand escrow"
                                disabled={busy === o.id}
                                onClick={() => reject(o)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="size-4" />
                              </TooltipIconButton>
                              <TooltipIconButton
                                label="Approve & send to influencer"
                                disabled={busy === o.id}
                                onClick={() => approve(o)}
                                className="text-emerald-500 hover:text-emerald-500"
                              >
                                <Check className="size-4" />
                              </TooltipIconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </>
    </ProtectedRoute>
  );
}