// invitation.ts
import { http } from "./api";

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";

export interface InvitationRole {
  id: string;
  name: string;
  color: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  status: InvitationStatus;
  message: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  brand?: { id: string; name: string; slug: string };
  invitedBy?: { id: string; name: string };
  teamRole?: InvitationRole;
  /** Present when the invitation is returned to its recipient */
  token?: string;
  inviteUrl?: string;
}

const PUBLIC_BASE =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export const invitationsApi = {
  /** Owner creates an invitation for a specific role */
  create: (email: string, teamRoleId: string, message?: string) =>
    http.post<{ message: string; invitation: Invitation }>("/api/invitations", {
      email,
      teamRoleId,
      message,
    }),

  /** List invitations the current user has sent */
  sent: () =>
    http.get<{ count: number; invitations: Invitation[] }>("/api/invitations/sent"),

  /** List invitations sent TO the current user's email */
  received: () =>
    http.get<{ count: number; invitations: Invitation[] }>("/api/invitations/received"),

  /** Cancel a pending invitation */
  cancel: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/invitations/${id}`),

  /** Public — fetch invitation by token (no auth) */
  getByToken: async (token: string): Promise<{ invitation: Invitation }> => {
    const res = await fetch(`${PUBLIC_BASE}/api/invitations/token/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Invitation not found");
    }
    return res.json();
  },

  /** Accept invitation by token (logged-in user) */
  accept: (token: string) =>
    http.post<{ message: string; id: string; status: InvitationStatus }>(
      `/api/invitations/token/${token}/accept`
    ),

  /** Decline invitation by token */
  decline: (token: string) =>
    http.post<{ message: string; id: string }>(
      `/api/invitations/token/${token}/decline`
    ),

  /** Redeem by pasted link or token */
  redeem: (code: string) =>
    http.post<{ message: string; id: string; status: InvitationStatus }>(
      "/api/invitations/redeem",
      { code }
    ),
};