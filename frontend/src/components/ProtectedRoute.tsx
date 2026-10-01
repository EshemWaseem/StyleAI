// components/ProtectedRoute.tsx
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useRole, type RoleName } from "@/lib/role";
import { billingApi, type BillingMeResponse } from "@/lib/billing";

interface Props {
  roles?: RoleName[];
  permissions?: string[];
  redirectTo?: string;
  children: ReactNode;
  /** Skip trial enforcement (used by /billing, /plans, /trial-expired, /settings) */
  skipTrialCheck?: boolean;
}

// Routes always allowed even when trial has expired
const TRIAL_SAFE_PATHS = [
  "/trial-expired",
  "/billing",
  "/plans",
  "/settings",
  "/login",
  "/register",
  "/pending",
];

export function ProtectedRoute({
  roles,
  permissions,
  redirectTo = "/dashboard",
  children,
  skipTrialCheck = false,
}: Props) {
  const { user, loading, hasRole, hasPermission } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [billing, setBilling] = useState<BillingMeResponse | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  // ---- Fetch billing (for trial enforcement) ----
  useEffect(() => {
    if (loading || !user) return;
    if (skipTrialCheck) return;

    // Skip for admins and pure shoppers
    if (
      user.roles.includes("SUPER_ADMIN") ||
      (user.roles.includes("SHOPPER") &&
        user.roles.every((r) => r === "SHOPPER"))
    ) {
      return;
    }

    setBillingLoading(true);
    billingApi
      .getMe()
      .then(setBilling)
      .catch(() => setBilling(null))
      .finally(() => setBillingLoading(false));
  }, [loading, user, skipTrialCheck]);

  // ---- Main navigation guard ----
  useEffect(() => {
    if (loading || billingLoading) return;

    // Not logged in → login
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // Pending approval → /pending
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }

    // Role check
    if (roles && roles.length > 0 && !hasRole(...roles)) {
      navigate({ to: redirectTo });
      return;
    }

    // Permission check
    if (
      permissions &&
      permissions.length > 0 &&
      !hasPermission(...permissions)
    ) {
      navigate({ to: redirectTo });
      return;
    }

    // ---- Trial / subscription enforcement ----
    if (skipTrialCheck || !billing) return;

    // Skip for admins & shoppers
    if (
      user.roles.includes("SUPER_ADMIN") ||
      (user.roles.includes("SHOPPER") &&
        user.roles.every((r) => r === "SHOPPER"))
    ) {
      return;
    }

    // Skip if path is in safe list
    const isSafePath = TRIAL_SAFE_PATHS.some((p) => pathname.startsWith(p));
    if (isSafePath) return;

    const state = billing.subscription?.effectiveState;

    // Block if trial expired, past_due, or expired paid plan
    if (
      state === "trial_expired" ||
      state === "past_due" ||
      state === "expired"
    ) {
      navigate({ to: "/trial-expired", replace: true });
    }
  }, [
    user,
    loading,
    billingLoading,
    billing,
    roles,
    permissions,
    navigate,
    redirectTo,
    hasRole,
    hasPermission,
    pathname,
    skipTrialCheck,
  ]);

  // ---- Loading UI ----
  if (loading || billingLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) return null;
  if (user.pendingApproval) return null;

  return <>{children}</>;
}