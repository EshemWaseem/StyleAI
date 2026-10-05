// frontend/src/lib/admin/types.ts

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

// ======================================================
// AI — Model Management (SRS §48-49)
// ======================================================

export type AIModelStatus = "PRODUCTION" | "STAGING" | "DEPRECATED" | "DISABLED";
export type AITaskType = "text" | "vision" | "embedding" | "image" | "ranking";

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  taskType: AITaskType | string;
  version: string;
  baseModel: string | null;
  status: AIModelStatus | string;
  accuracy: number | null;
  evaluationScore: number | null;
  evaluationNotes: string | null;
  trainingDataset: string | null;
  trainingDate: string | null;
  trainingHours: number | null;
  costPer1kInput: number | null;
  costPer1kOutput: number | null;
  costPerCall: number | null;
  isDefault: boolean;
  meta: any;
  createdAt: string;
  updatedAt: string;
}

export interface AIProviderBreakdown {
  calls: number;
  cost: number;
  tokens: number;
  errors: number;
}

export interface AITaskBreakdown {
  calls: number;
  cost: number;
}

export interface AIUsageStats {
  sinceHours: number;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  successRate: number;
  avgLatencyMs: number;
  totalCost: number;
  totalTokens: number;
  byProvider: Record<string, AIProviderBreakdown>;
  byTask: Record<string, AITaskBreakdown>;
}

export interface AITimelinePoint {
  date: string;
  calls: number;
  cost: number;
  tokens: number;
  errors: number;
}

export interface AIUsageRow {
  id: string;
  modelName: string;
  provider: string;
  taskType: string;
  status: "SUCCESS" | "ERROR" | "TIMEOUT" | string;
  latencyMs: number | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  userId: string | null;
  organizationId: string | null;
  route: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AIUsageListResponse {
  usages: AIUsageRow[];
  total: number;
  limit: number;
  offset: number;
}