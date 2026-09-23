import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { http } from "./api";

export type RoleName =
  | "SUPER_ADMIN"
  | "BRAND_OWNER"
  | "BRAND_TEAM_MEMBER"
  | "INFLUENCER"
  | "AGENCY"
  | "SHOPPER";

export interface PendingRequestInfo {
  id: string;
  brandId: string;
  brandName: string | null;
  requestedRoleId: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  organizationId: string | null;
  roles: RoleName[];
  permissions: string[];

  // Brand team context (populated after approval)
  brandId: string | null;
  brandName: string | null;
  brandTeamRole: {
    id: string;
    name: string;
    permissions: string[];
    isOwnerRole: boolean;
  } | null;

  // NEW — pending approval
  pendingApproval: boolean;
  pendingRequest: PendingRequestInfo | null;
}

export const roleLabels: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Admin",
  BRAND_OWNER: "Brand Owner",
  BRAND_TEAM_MEMBER: "Brand Team Member",
  INFLUENCER: "Influencer",
  AGENCY: "Agency",
  SHOPPER: "Shopper",
};

export const PUBLIC_SIGNUP_ROLES: RoleName[] = [
  "BRAND_OWNER",
  "BRAND_TEAM_MEMBER",
  "INFLUENCER",
  "AGENCY",
  "SHOPPER",
];

export const ROLES_REQUIRING_ORG: RoleName[] = ["BRAND_OWNER", "AGENCY"];

const ROLE_DASHBOARD: Record<RoleName, string> = {
  SUPER_ADMIN: "/admin",
  BRAND_OWNER: "/dashboard",
  BRAND_TEAM_MEMBER: "/dashboard",
  INFLUENCER: "/dashboard",
  AGENCY: "/dashboard",
  SHOPPER: "/",
};

export function getDashboardPath(roles: RoleName[]): string {
  if (!roles.length) return "/dashboard";
  const priority: RoleName[] = [
    "SUPER_ADMIN",
    "AGENCY",
    "BRAND_OWNER",
    "BRAND_TEAM_MEMBER",
    "INFLUENCER",
    "SHOPPER",
  ];
  for (const r of priority) {
    if (roles.includes(r)) return ROLE_DASHBOARD[r];
  }
  return "/dashboard";
}

// ======================================================
// Context
// ======================================================

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: RoleName;
  organizationName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (...roles: RoleName[]) => boolean;
  hasPermission: (...perms: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({}) as AuthUser,
  register: async () => ({}) as AuthUser,
  logout: () => {},
  hasRole: () => false,
  hasPermission: () => false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    http
      .get<{ user: AuthUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await http.post<{ token: string; user: AuthUser }>(
      "/api/auth/login",
      { email, password },
      { skipAuth: true }
    );
    localStorage.setItem("token", res.token);
    const me = await http.get<{ user: AuthUser }>("/api/auth/me");
    localStorage.setItem("user", JSON.stringify(me.user));
    setUser(me.user);
    return me.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await http.post<{ token: string; user: AuthUser }>(
      "/api/auth/register",
      payload,
      { skipAuth: true }
    );
    localStorage.setItem("token", res.token);
    const me = await http.get<{ user: AuthUser }>("/api/auth/me");
    localStorage.setItem("user", JSON.stringify(me.user));
    setUser(me.user);
    return me.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  const hasRole = useCallback(
    (...roles: RoleName[]) =>
      !!user && user.roles.some((r) => roles.includes(r)),
    [user]
  );

  const hasPermission = useCallback(
    (...perms: string[]) =>
      !!user && perms.every((p) => user.permissions.includes(p)),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, hasRole, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useRole = () => useContext(AuthContext);
export const useAuth = useRole;
export const usePermission = () => {
  const { hasPermission, hasRole } = useRole();
  return { can: hasPermission, is: hasRole };
};