// protectedRoutes

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useRole, type RoleName } from "@/lib/role";

interface Props {
  roles?: RoleName[];
  permissions?: string[];
  redirectTo?: string;
  children: ReactNode;
}

export function ProtectedRoute({
  roles,
  permissions,
  redirectTo = "/dashboard",
  children,
}: Props) {
  const { user, loading, hasRole, hasPermission } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not logged in → login
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // NEW — Pending approval → /pending
    if (user.pendingApproval) {
      navigate({ to: "/pending" });
      return;
    }

    if (roles && roles.length > 0 && !hasRole(...roles)) {
      navigate({ to: redirectTo });
      return;
    }

    if (
      permissions &&
      permissions.length > 0 &&
      !hasPermission(...permissions)
    ) {
      navigate({ to: redirectTo });
    }
  }, [
    user,
    loading,
    roles,
    permissions,
    navigate,
    redirectTo,
    hasRole,
    hasPermission,
  ]);

  if (loading) {
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