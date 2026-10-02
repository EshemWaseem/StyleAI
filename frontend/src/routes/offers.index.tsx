import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { offersApi } from "@/lib/offers";
import type { Offer } from "@/lib/offers";

export const Route = createFileRoute("/offers/")({
  head: () => ({ meta: [{ title: "Offers — StyleAI" }] }),
  component: OffersListPage,
});

function OffersListPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    offersApi
      .list({ limit: 100 })
      .then((r) => setOffers(r.offers))
      .catch((e) => setError(e?.message || "Failed to load offers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow="Collaborations"
          title="Custom offers"
          description="Offers between brands and influencers — track their status end-to-end."
          actions={
            <Button asChild>
              <Link to="/offers/new">
                <Plus className="mr-1 size-4" /> New offer
              </Link>
            </Button>
          }
        />

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
            <p className="mt-3 text-sm text-muted-foreground">No offers yet.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Brand</th>
                    <th className="p-3 font-medium">Influencer</th>
                    <th className="p-3 font-medium text-right">Items</th>
                    <th className="p-3 font-medium text-right">Total</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offers.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/5">
                      <td className="p-3">
                        <Link to="/offers/$id" params={{ id: o.id }} className="font-medium hover:underline">
                          {o.title || `Offer #${o.id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {o.brand?.name || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {o.influencer?.displayName || "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">{o.items.length}</td>
                      <td className="p-3 text-right tabular-nums">
                        {o.currency} {o.total.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <OfferStatusBadge status={o.status} />
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()}
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

export function OfferStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PENDING_ADMIN: "bg-amber-500/15 text-amber-500",
    ADMIN_APPROVED: "bg-blue-500/15 text-blue-500",
    ADMIN_REJECTED: "bg-destructive/15 text-destructive",
    INFLUENCER_ACCEPTED: "bg-emerald-500/15 text-emerald-500",
    INFLUENCER_DECLINED: "bg-destructive/15 text-destructive",
    EXPIRED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${styles[status] || "bg-muted"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}