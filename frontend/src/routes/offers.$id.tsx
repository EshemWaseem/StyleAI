// routes/offers.$id.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Send, Check, X, Ban } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OfferStatusBadge } from "@/components/offers/OfferStatusBadge";
import { offersApi } from "@/lib/offers";
import type { Offer } from "@/lib/offers";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/offers/$id")({
  head: () => ({ meta: [{ title: "Offer — StyleAI" }] }),
  component: OfferDetailPage,
});

function OfferDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useRole();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await offersApi.get(id);
      setOffer(r.offer);
    } catch (e: any) {
      setError(e?.message || "Failed to load offer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function act(fn: () => Promise<any>) {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      setOffer(r.offer);
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  // ======================================================
  // Identity — STRICT ownership (not just "user exists")
  // ======================================================
  const isAdmin = !!user?.roles?.includes("SUPER_ADMIN" as any);

  const isBrandOwner =
    !!user?.organizationId &&
    !!offer?.brand?.organizationId &&
    user.organizationId === offer.brand.organizationId;

  const isTargetInfluencer =
    !!user?.id &&
    !!offer?.influencer?.userId &&
    offer.influencer.userId === user.id;

  // ======================================================
  // Permission flags
  // ======================================================
  const canSubmitForReview =
    isBrandOwner && offer?.status === "DRAFT";

  const canCancel =
    isBrandOwner && ["DRAFT", "PENDING_ADMIN", "ADMIN_APPROVED"].includes(offer?.status || "");

  const canAdminReview =
    isAdmin && offer?.status === "PENDING_ADMIN";

  const canInfluencerReview =
    isTargetInfluencer && offer?.status === "ADMIN_APPROVED";

  // ======================================================
  // Loading
  // ======================================================
  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell breadcrumb={["Offers", "Loading"]}>
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (error && !offer) {
    return (
      <ProtectedRoute>
        <AppShell breadcrumb={["Offers"]}>
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error || "Offer not found"}</span>
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate({ to: "/offers" })}>
              <ArrowLeft className="mr-1 size-4" /> Back to offers
            </Button>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!offer) return null;

  const items = Array.isArray(offer.items) ? offer.items : [];

  return (
    <ProtectedRoute>
      <AppShell breadcrumb={["Offers", offer.title || String(offer.id).slice(0, 8)]}>
        <PageHeader
          eyebrow="Offer"
          title={offer.title || `Offer #${String(offer.id).slice(0, 8)}`}
          description={`Between ${offer.brand?.name || "—"} and ${offer.influencer?.displayName || "—"}`}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/offers"><ArrowLeft className="mr-1 size-4" /> Back</Link>
            </Button>
          }
        />

        {/* Status + viewer role indicator */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <OfferStatusBadge status={offer.status} />
          {isBrandOwner && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              You are the brand
            </span>
          )}
          {isTargetInfluencer && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              You are the influencer
            </span>
          )}
          {isAdmin && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
              Admin view
            </span>
          )}
        </div>

        {/* Line items */}
        <Panel className="mt-6 overflow-hidden">
          <SectionTitle title="Line items" />
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No items on this offer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Platform</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium text-right">Qty</th>
                    <th className="p-3 font-medium text-right">Unit</th>
                    <th className="p-3 font-medium text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium">{it.platform}</td>
                      <td className="p-3 capitalize text-muted-foreground">{it.contentType}</td>
                      <td className="p-3 text-right tabular-nums">{it.quantity}</td>
                      <td className="p-3 text-right tabular-nums">
                        {offer.currency} {Number(it.unitPrice || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {offer.currency} {Number(it.lineTotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Financials */}
        <Panel className="mt-4 p-6">
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={`${offer.currency} ${Number(offer.subtotal || 0).toFixed(2)}`} />
            {Number(offer.discountAmount || 0) > 0 && (
              <Row
                label={`Bulk discount (${offer.discountPct}%)`}
                value={`− ${offer.currency} ${Number(offer.discountAmount).toFixed(2)}`}
                muted
              />
            )}
            <Row
              label={`Platform fee (${offer.adminFeePct}%)`}
              value={`+ ${offer.currency} ${Number(offer.adminFee || 0).toFixed(2)}`}
              muted
            />
            <div className="border-t border-border pt-2">
              <Row
                label="Total (brand pays)"
                value={`${offer.currency} ${Number(offer.total || 0).toFixed(2)}`}
                bold
              />
            </div>
          </dl>
        </Panel>

        {/* Notes */}
        {(offer.brandNote || offer.adminNote || offer.influencerNote) && (
          <Panel className="mt-4 space-y-3 p-6 text-sm">
            {offer.brandNote && <Note label="Brand note" value={offer.brandNote} />}
            {offer.adminNote && <Note label="Platform note" value={offer.adminNote} />}
            {offer.influencerNote && <Note label="Influencer note" value={offer.influencerNote} />}
          </Panel>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ====================================================== */}
        {/* ACTIONS — role-aware                                    */}
        {/* ====================================================== */}
        <div className="mt-6 flex flex-wrap items-end justify-end gap-2">

          {/* ---- Brand: Submit DRAFT ---- */}
          {canSubmitForReview && (
            <Button
              disabled={busy}
              onClick={() => act(() => offersApi.submit(offer.id))}
            >
              <Send className="mr-1 size-4" /> Submit for review
            </Button>
          )}

          {/* ---- Brand: Cancel ---- */}
          {canCancel && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                  if (!confirm("Cancel this offer? Escrow will be released back to your wallet.")) return;
                  act(() => offersApi.cancel(offer.id, "Cancelled by brand"));
                }}
            >
              <Ban className="mr-1 size-4" /> Cancel offer
            </Button>
          )}

          {/* ---- Admin: Approve / Reject ---- */}
          {canAdminReview && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  act(() =>
                    offersApi.adminReview(offer.id, {
                      decision: "reject",
                      adminNote: "Rejected by admin",
                    })
                  )
                }
              >
                <X className="mr-1 size-4" /> Reject
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  act(() => offersApi.adminReview(offer.id, { decision: "approve" }))
                }
              >
                <Check className="mr-1 size-4" /> Approve
              </Button>
            </>
          )}

          {/* ---- Influencer: Accept / Decline ---- */}
          {canInfluencerReview && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  act(() =>
                    offersApi.influencerReview(offer.id, {
                      decision: "decline",
                      influencerNote: "Declined",
                    })
                  )
                }
              >
                <X className="mr-1 size-4" /> Decline
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  act(() => offersApi.influencerReview(offer.id, { decision: "accept" }))
                }
              >
                <Check className="mr-1 size-4" /> Accept offer
              </Button>
            </>
          )}

          {/* ---- Status hints (no buttons) ---- */}
          {offer.status === "PENDING_ADMIN" && isBrandOwner && !isAdmin && (
            <p className="text-xs text-muted-foreground">
              Waiting for admin approval…
            </p>
          )}
          {offer.status === "PENDING_ADMIN" && !isBrandOwner && !isAdmin && (
            <p className="text-xs text-muted-foreground">
              Waiting for admin approval…
            </p>
          )}
          {offer.status === "ADMIN_APPROVED" && isBrandOwner && (
            <p className="text-xs text-muted-foreground">
              Sent to influencer — waiting for their response.
            </p>
          )}
          {offer.status === "ADMIN_APPROVED" && isInfluencerSideHint(isTargetInfluencer) && null}
          {offer.status === "ADMIN_APPROVED" && !isBrandOwner && !isAdmin && !isTargetInfluencer && (
            <p className="text-xs text-muted-foreground">
              Waiting for influencer to respond…
            </p>
          )}
          {offer.status === "INFLUENCER_ACCEPTED" && (
            <p className="text-xs font-medium text-emerald-500">
              ✓ Offer accepted
            </p>
          )}
          {offer.status === "INFLUENCER_DECLINED" && (
            <p className="text-xs font-medium text-destructive">
              Offer declined
            </p>
          )}
          {offer.status === "ADMIN_REJECTED" && (
            <p className="text-xs font-medium text-destructive">
              Rejected by admin
            </p>
          )}
          {offer.status === "CANCELLED" && (
            <p className="text-xs font-medium text-muted-foreground">
              Offer cancelled
            </p>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

// Small helper to keep JSX tidy
function isInfluencerSideHint(v: boolean) { return v; }

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={`tabular-nums ${bold ? "text-base font-medium" : ""}`}>{value}</dd>
    </div>
  );
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}