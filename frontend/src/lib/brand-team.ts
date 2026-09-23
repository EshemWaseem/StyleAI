import { http } from "./api";

// ======================================================
// TYPES
// ======================================================

export interface BrandTeamRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  color: string | null;
  isDefault: boolean;
  isOwnerRole: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandTeamMember {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  joinedAt: string;
  user?: { id: string; name: string; email: string };
  role?: {
    id: string;
    name: string;
    color: string | null;
    permissions: string[];
    isOwnerRole: boolean;
  };
  invitedBy?: { id: string; name: string };
}

export interface MyMembership {
  id: string;
  brand: { id: string; name: string; slug: string };
  role: {
    id: string;
    name: string;
    color: string | null;
    permissions: string[];
    isOwnerRole: boolean;
  };
  joinedAt: string;
}

export interface PermissionGroup {
  label: string;
  description: string;
  permissions: { key: string; label: string }[];
}

export interface PermissionCatalog {
  groups: Record<string, PermissionGroup>;
  allKeys: string[];
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
  color?: string;
  brandId?: string;
}

export type DirectAddResult =
  | { type: "ADDED"; message: string; member: BrandTeamMember }
  | { type: "INVITED"; message: string; invitation: any };

// ======================================================
// ROLES API
// ======================================================

export const brandTeamRolesApi = {
  list: (brandId?: string) =>
    http.get<{ count: number; roles: BrandTeamRole[] }>(
      `/api/brand-team/roles${brandId ? `?brandId=${brandId}` : ""}`
    ),

  get: (id: string) =>
    http.get<{ role: BrandTeamRole }>(`/api/brand-team/roles/${id}`),

  create: (data: RoleInput) =>
    http.post<{ message: string; role: BrandTeamRole }>(
      "/api/brand-team/roles",
      data
    ),

  update: (id: string, data: Partial<RoleInput>) =>
    http.patch<{ message: string; role: BrandTeamRole }>(
      `/api/brand-team/roles/${id}`,
      data
    ),

  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(
      `/api/brand-team/roles/${id}`
    ),
};

// ======================================================
// MEMBERS API
// ======================================================

export const brandTeamMembersApi = {
  list: (brandId?: string) =>
    http.get<{ count: number; members: BrandTeamMember[] }>(
      `/api/brand-team/members${brandId ? `?brandId=${brandId}` : ""}`
    ),

  get: (id: string) =>
    http.get<{ member: BrandTeamMember }>(`/api/brand-team/members/${id}`),

  /** Smart add: adds if user exists, else creates invitation */
  directAdd: (email: string, teamRoleId: string, message?: string) =>
    http.post<DirectAddResult>("/api/brand-team/members/add", {
      email,
      teamRoleId,
      message,
    }),

  changeRole: (memberId: string, teamRoleId: string) =>
    http.patch<{ message: string; member: BrandTeamMember }>(
      `/api/brand-team/members/${memberId}/role`,
      { teamRoleId }
    ),

  setStatus: (memberId: string, status: "ACTIVE" | "SUSPENDED") =>
    http.patch<{ message: string; member: BrandTeamMember }>(
      `/api/brand-team/members/${memberId}/status`,
      { status }
    ),

  remove: (memberId: string) =>
    http.delete<{ message: string; id: string }>(
      `/api/brand-team/members/${memberId}`
    ),
};

// ======================================================
// ME
// ======================================================

export const brandTeamMeApi = {
  get: () => http.get<{ membership: MyMembership | null }>("/api/brand-team/me"),
};

// ======================================================
// PERMISSION CATALOG
// ======================================================

export const brandTeamPermissionsApi = {
  catalog: () => http.get<PermissionCatalog>("/api/brand-team/permissions"),
};

// ======================================================
// CONVENIENCE
// ======================================================

export const brandTeamApi = {
  // Roles
  listRoles: brandTeamRolesApi.list,
  getRole: brandTeamRolesApi.get,
  createRole: brandTeamRolesApi.create,
  updateRole: brandTeamRolesApi.update,
  deleteRole: brandTeamRolesApi.remove,

  // Members
  listMembers: brandTeamMembersApi.list,
  getMember: brandTeamMembersApi.get,
  directAddMember: brandTeamMembersApi.directAdd,
  changeMemberRole: brandTeamMembersApi.changeRole,
  setMemberStatus: brandTeamMembersApi.setStatus,
  removeMember: brandTeamMembersApi.remove,

  // Me
  myMembership: brandTeamMeApi.get,

  // Catalog
  permissionCatalog: brandTeamPermissionsApi.catalog,
};

// ======================================================
// COLOR HELPERS
// ======================================================

export const ROLE_COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  pink: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30" },
  red: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  zinc: { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" },
};

export function getRoleColorClasses(color: string | null) {
  return ROLE_COLOR_CLASSES[color ?? "zinc"] ?? ROLE_COLOR_CLASSES.zinc;
}