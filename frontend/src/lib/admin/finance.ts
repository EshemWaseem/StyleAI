import { http } from "../api";

export interface FinanceRule {
  key: string;
  value: number | string | null;
}

export const financeApi = {
  getRules: () =>
    http.get<{ rules: FinanceRule[] }>("/api/admin/finance"),
  updateRules: (updates: Record<string, number | string>) =>
    http.patch<{ message: string; rules: FinanceRule[] }>("/api/admin/finance", updates),
};

export interface PlatformSettings {
  finance?: Record<string, any>;
  limits?: Record<string, any>;
  features?: Record<string, any>;
}

export const settingsApi = {
  getAll: () =>
    http.get<{ settings: PlatformSettings }>("/api/admin/settings"),
  update: (updates: Record<string, { value: any; category?: string }>) =>
    http.patch<{ message: string; updated: any[] }>("/api/admin/settings", updates),
};

export interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: any;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

export const auditApi = {
  list: (filters: { action?: string; targetType?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    return http.get<{ logs: AuditRow[]; total: number; limit: number; offset: number }>(
      `/api/admin/audit${q ? `?${q}` : ""}`
    );
  },
};