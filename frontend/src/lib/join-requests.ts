import { http } from "./api";

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface JoinRequestRole {
  id: string;
  name: string;
  color: string | null;
}

export interface JoinRequest {
  id: string;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  user?: { id: string; name: string; email: string };
  brand?: { id: string; name: string; slug?: string };
  reviewer?: { id: string; name: string };
  requestedRole?: JoinRequestRole;
  approvedRole?: JoinRequestRole;
}

export const joinRequestsApi = {
  /** Send a new request — optionally specifying the role you want */
  create: (brandId: string, message?: string, requestedRoleId?: string) =>
    http.post<{ message: string; request: JoinRequest }>("/api/join-requests", {
      brandId,
      message,
      requestedRoleId,
    }),

  /** My own requests */
  mine: () =>
    http.get<{ count: number; requests: JoinRequest[] }>("/api/join-requests/mine"),

  /** Cancel my pending request */
  cancelMine: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/join-requests/mine/${id}`),

  /** Brand owner — list pending requests for their brand */
  pending: (status: string = "PENDING") =>
    http.get<{ count: number; requests: JoinRequest[] }>(
      `/api/join-requests/pending?status=${status}`
    ),

  /** Brand owner — approve (with optional role assignment) */
  approve: (id: string, approvedRoleId?: string) =>
    http.patch<{ message: string; request: JoinRequest }>(
      `/api/join-requests/${id}/approve`,
      { approvedRoleId }
    ),

  /** Brand owner — reject */
  reject: (id: string, reason?: string) =>
    http.patch<{ message: string; request: JoinRequest }>(
      `/api/join-requests/${id}/reject`,
      { reason }
    ),
};