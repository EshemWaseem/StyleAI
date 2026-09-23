import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Clock,
  X,
  LogOut,
  RefreshCw,
  Mail,
  Check,
  Link2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import { joinRequestsApi } from "@/lib/join-requests";
import { invitationsApi, type Invitation } from "@/lib/invitations";
import { getRoleColorClasses } from "@/lib/brand-team";

export const Route = createFileRoute("/pending")({
  head: () => ({ meta: [{ title: "Pending approval — StyleAI" }] }),
  component: PendingPage,
});

function PendingPage() {
  const { user, loading: authLoading, logout } = useRole();
  const navigate = useNavigate();

  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  // Received invitations
  const [receivedInvites, setReceivedInvites] = useState<Invitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Redeem by link
  const [redeemInput, setRedeemInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  // Redirect logic
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!user.pendingApproval) {
      navigate({ to: "/dashboard" });
    }
  }, [user, authLoading, navigate]);

  // Load received invitations
  useEffect(() => {
    if (authLoading || !user?.pendingApproval) return;

    invitationsApi
      .received()
      .then((res) => setReceivedInvites(res.invitations))
      .catch(() => setReceivedInvites([]))
      .finally(() => setLoadingInvites(false));
  }, [authLoading, user]);

  async function handleAcceptInvite(invite: Invitation) {
    if (!invite.token) {
      setError("This invitation is missing its code. Please use the link.");
      return;
    }
    setAcceptingId(invite.id);
    setError("");
    try {
      await invitationsApi.accept(invite.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "Failed to accept invitation");
      setAcceptingId(null);
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setRedeemError("");
    setRedeemSuccess(false);

    if (!redeemInput.trim()) {
      setRedeemError("Please paste an invitation link or code");
      return;
    }

    setRedeeming(true);
    try {
      await invitationsApi.redeem(redeemInput.trim());
      setRedeemSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } catch (err: any) {
      setRedeemError(err?.message || "Invalid invitation link");
    } finally {
      setRedeeming(false);
    }
  }

  async function handleRefresh() {
    window.location.reload();
  }

  async function handleCancel() {
    if (!user?.pendingRequest) return;
    if (!confirm("Cancel your join request?")) return;

    setCancelling(true);
    setError("");
    try {
      await joinRequestsApi.cancelMine(user.pendingRequest.id);
      logout();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel request");
      setCancelling(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
              S
            </span>
            <span className="font-display text-[15px]">StyleAI</span>
          </Link>

          <div className="mx-auto mt-8 grid size-14 place-items-center rounded-full bg-amber-500/15 text-amber-500">
            <Clock className="size-7" />
          </div>

          <h1 className="mt-5 font-display text-3xl font-medium tracking-tight">
            Waiting for approval
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your request is pending with the brand owner.
          </p>
        </div>

        {/* ====================================================== */}
        {/* RECEIVED INVITATIONS */}
        {/* ====================================================== */}
        {!loadingInvites && receivedInvites.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium">
              You have {receivedInvites.length} invitation
              {receivedInvites.length === 1 ? "" : "s"}
            </h2>
            <div className="space-y-3">
              {receivedInvites.map((inv) => {
                const roleColor = getRoleColorClasses(
                  inv.teamRole?.color ?? "zinc"
                );
                const accepting = acceptingId === inv.id;

                return (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full",
                          roleColor.bg
                        )}
                      >
                        <Mail className={cn("size-5", roleColor.text)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {inv.brand?.name ?? "Brand"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invited by {inv.invitedBy?.name ?? "owner"}
                        </p>
                        {inv.teamRole && (
                          <span
                            className={cn(
                              "mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              roleColor.bg,
                              roleColor.text,
                              roleColor.border
                            )}
                          >
                            {inv.teamRole.name}
                          </span>
                        )}
                        {inv.message && (
                          <p className="mt-2 text-xs italic text-muted-foreground">
                            "{inv.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvite(inv)}
                        disabled={accepting}
                      >
                        <Check className="size-3.5" />
                        {accepting ? "Joining…" : "Accept & join"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================== */}
        {/* REDEEM BY LINK */}
        {/* ====================================================== */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Have an invite link?</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Paste the invitation link or code from the brand owner.
          </p>

          <form onSubmit={handleRedeem} className="mt-3 space-y-2">
            <Input
              placeholder="https://…/invite/abc123…"
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value)}
              disabled={redeeming || redeemSuccess}
            />

            {redeemError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{redeemError}</span>
              </div>
            )}

            {redeemSuccess && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" />
                <span>Joined! Redirecting to your workspace…</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={redeeming || redeemSuccess || !redeemInput.trim()}
              className="w-full"
            >
              {redeeming ? "Joining…" : "Join team"}
            </Button>
          </form>
        </div>

        {/* ====================================================== */}
        {/* PENDING REQUEST INFO */}
        {/* ====================================================== */}
        {user.pendingRequest && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your pending request
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Sent to:</span>
                <span className="font-medium">
                  {user.pendingRequest.brandName ?? "brand"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-500">
                  Pending
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="size-4" />
            Check approval status
          </Button>

          {user.pendingRequest && (
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full text-destructive hover:text-destructive"
            >
              <X className="size-4" />
              {cancelling ? "Cancelling…" : "Cancel my request"}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={logout}
            className="w-full text-muted-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}