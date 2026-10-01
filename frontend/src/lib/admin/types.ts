export interface PlatformStats {
  users: { total: number; active: number; inactive: number };
  organizations: number;
  brands: number;
  products: number;
  influencers: number;
  agencies: number;
  shoppers: number;
  campaigns: number;
  recentUsers: AdminUserSummary[];
  generatedAt: string;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  organizationId?: string | null;
  organization?: { id: string; name: string; slug: string } | null;
  orderCount?: number;
}

export interface AdminUserFilters {
  role?: string;
  search?: string;
  status?: "active" | "inactive";
  limit?: number;
  offset?: number;
}

export interface AdminUserListResponse {
  total: number;
  count: number;
  users: AdminUserSummary[];
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  organization: any;
  roles: string[];
  brandMemberships: Array<{
    id: string;
    brand: { id: string; name: string; slug: string };
    teamRole: { id: string; name: string };
    status: string;
  }>;
  hasInfluencerProfile: boolean;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}