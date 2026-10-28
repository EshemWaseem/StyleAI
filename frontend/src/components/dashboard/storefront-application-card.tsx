// components/dashboard/storefront-application-card.tsx
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2, Clock3, Info, Loader2, Send, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  brandStorefrontApi, type MyStorefrontStatus,
} from "@/lib/storefront";
import { ApplyForStorefrontModal } from "./apply-for-storefront-modal";

export function StorefrontApplicationCard() {
  const [status, setStatus] = useState<MyStorefrontStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await brandStorefrontApi.getMyStatus();
      setStatus(res.status);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw() {
    if (!window.confirm("Withdraw your storefront application?")) return;
    setActionLoading(true);
    try {
      await brandStorefrontApi.withdraw();
      await load();
    } catch {
      /* noop */
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !status) return null;

  if (status.status === "NOT_REQUESTED") {
    return (
      <>
        <section className="mt-2">
          <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-accent/5 via-transparent to-transparent p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                <Store className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-medium">
                  Get featured on StyleAI
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Apply to feature your products on the public storefront. Choose
                  which products and how you want them shown.
                </p>
              </div>
              <Button onClick={() => setShowApplyModal(true)}>
                <Send className="mr-2 size-4" /> Apply now
              </Button>
            </div>
          </div>
        </section>

        {showApplyModal && (
          <ApplyForStorefrontModal
            onClose={() => setShowApplyModal(false)}
            onSubmitted={async () => {
              setShowApplyModal(false);
              await load();
            }}
          />
        )}
      </>
    );
  }

  if (status.status === "REQUESTED") {
    const requested = status.application?.products?.length ?? 0;
    return (
      <section className="mt-2">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-500">
              <Clock3 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">
                Application under review
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status.appliedAt
                  ? `Submitted ${new Date(status.appliedAt).toLocaleDateString()}. ${requested} product${requested === 1 ? "" : "s"} requested. We'll notify you once reviewed.`
                  : "We'll notify you once reviewed."}
              </p>
            </div>
            <Button variant="outline" onClick={withdraw} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Withdrawing…
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (status.status === "APPROVED") {
    return (
      <section className="mt-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">
                You're live on the storefront
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status.visibleProductCount} of {status.productCount} products are
                currently visible. Toggle products from your catalog.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/products">Manage products</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-2">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive">
              <Info className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium">
                Application not approved
              </p>
              {status.declineReason && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  "{status.declineReason}"
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                You can update your products and re-apply anytime.
              </p>
            </div>
            <Button onClick={() => setShowApplyModal(true)}>Re-apply</Button>
          </div>
        </div>
      </section>

      {showApplyModal && (
        <ApplyForStorefrontModal
          onClose={() => setShowApplyModal(false)}
          onSubmitted={async () => {
            setShowApplyModal(false);
            await load();
          }}
        />
      )}
    </>
  );
}