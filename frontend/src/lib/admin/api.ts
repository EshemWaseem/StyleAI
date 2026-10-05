// frontend/src/lib/admin/api.ts
import { http } from "../api";
import type {
  AdminUserFilters,
  AdminUserListResponse,
  PlatformStats,
  AIModel,
  AIUsageStats,
  AITimelinePoint,
  AIUsageListResponse,
} from "./types";

export const adminApi = {
  // ---------- Dashboard ----------
  getStats: () =>
    http.get<{ success: boolean; data: PlatformStats }>("/api/admin/dashboard"),

  // ---------- Users ----------
  listUsers: (filters: AdminUserFilters = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<AdminUserListResponse>(`/api/admin/users${q ? `?${q}` : ""}`);
  },
  getUser: (id: string) => http.get<{ user: any }>(`/api/admin/users/${id}`),
  activateUser: (id: string) =>
    http.patch<{ message: string }>(`/api/admin/users/${id}/activate`, {}),
  deactivateUser: (id: string) =>
    http.patch<{ message: string }>(`/api/admin/users/${id}/deactivate`, {}),
  changeRole: (id: string, roleName: string) =>
    http.patch<{ message: string }>(`/api/admin/users/${id}/role`, { roleName }),
  deleteUser: (id: string) =>
    http.delete<{ message: string }>(`/api/admin/users/${id}`),

  // ---------- Brands ----------
  listBrands: (filters: { search?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ total: number; count: number; brands: any[] }>(
      `/api/admin/brands${q ? `?${q}` : ""}`
    );
  },
  deleteBrand: (id: string) =>
    http.delete<{ message: string }>(`/api/admin/brands/${id}`),

  // ---------- Influencers ----------
  listInfluencers: (filters: { search?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ total: number; count: number; influencers: any[] }>(
      `/api/admin/influencers${q ? `?${q}` : ""}`
    );
  },
  updateInfluencerStatus: (id: string, status: string) =>
    http.patch<{ message: string }>(`/api/admin/influencers/${id}/status`, { status }),
  deleteInfluencer: (id: string) =>
    http.delete<{ message: string }>(`/api/admin/influencers/${id}`),

  // ---------- Agencies ----------
  listAgencies: (filters: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ total: number; count: number; agencies: any[] }>(
      `/api/admin/agencies${q ? `?${q}` : ""}`
    );
  },

  // ---------- Products ----------
  listProducts: (filters: { search?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ total: number; count: number; products: any[] }>(
      `/api/admin/products${q ? `?${q}` : ""}`
    );
  },
  deleteProduct: (id: string) =>
    http.delete<{ message: string }>(`/api/admin/products/${id}`),

  // ---------- Campaigns ----------
  listCampaigns: (filters: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ total: number; count: number; campaigns: any[] }>(
      `/api/admin/campaigns${q ? `?${q}` : ""}`
    );
  },

  // ---------- Payments ----------
  listPayments: (filters: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ total: number; count: number; totalRevenue: number; payments: any[] }>(
      `/api/admin/payments${q ? `?${q}` : ""}`
    );
  },

  // ---------- AI (Model Management — SRS §48-49) ----------
  getAIStats: (sinceHours = 24) =>
    http.get<{ stats: AIUsageStats }>(`/api/admin/ai/stats?sinceHours=${sinceHours}`),

  getAITimeline: (days = 7) =>
    http.get<{ timeline: AITimelinePoint[] }>(`/api/admin/ai/timeline?days=${days}`),

  listAIUsage: (filters: { limit?: number; offset?: number; provider?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<AIUsageListResponse>(`/api/admin/ai/usage${q ? `?${q}` : ""}`);
  },

  listAIModels: (filters: { taskType?: string; provider?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ models: AIModel[] }>(`/api/admin/ai/models${q ? `?${q}` : ""}`);
  },

  getAIModel: (id: string) =>
    http.get<{ model: AIModel }>(`/api/admin/ai/models/${id}`),

  createAIModel: (payload: Partial<AIModel>) =>
    http.post<{ message: string; model: AIModel }>(`/api/admin/ai/models`, payload),

  updateAIModel: (id: string, payload: Partial<AIModel>) =>
    http.patch<{ message: string; model: AIModel }>(`/api/admin/ai/models/${id}`, payload),

  deleteAIModel: (id: string) =>
    http.delete<{ message: string }>(`/api/admin/ai/models/${id}`),
};