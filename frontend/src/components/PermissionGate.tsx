import type { ReactNode } from "react";
import { useRole, type RoleName } from "@/lib/role";

interface Props {
  role?: RoleName | RoleName[];
  permission?: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally render children based on role/permission.
 * Hides UI elements the user has no right to see.
 * NOTE: backend STILL enforces — this is UX only.
 */
export function PermissionGate({
  role,
  permission,
  fallback = null,
  children,
}: Props) {
  const { hasRole, hasPermission } = useRole();

  const roles = Array.isArray(role) ? role : role ? [role] : [];
  const perms = Array.isArray(permission)
    ? permission
    : permission
    ? [permission]
    : [];

  const roleOk = roles.length === 0 || hasRole(...roles);
  const permOk = perms.length === 0 || hasPermission(...perms);

  if (!roleOk || !permOk) return <>{fallback}</>;
  return <>{children}</>;
}