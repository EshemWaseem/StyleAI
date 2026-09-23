import { http } from "./api";

// ======================================================
// LEGACY TEAM API — kept for backwards compatibility
//
// ⚠️  The "Team" concept has been replaced by brand-level roles.
//     New code should use `brandTeamApi` from `./brand-team`.
//     This file remains so that /teams/:teamId detail page keeps working
//     until it is fully migrated in a later phase.
// ======================================================

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  roles: string[];
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  organization: { id: string; name: string; slug: string };
  memberCount?: number;
  members?: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamInput {
  name: string;
  description?: string;
}

/** @deprecated Use `brandTeamApi` from `./brand-team` instead */
export const teamsApi = {
  list: () => http.get<{ count: number; teams: Team[] }>("/api/teams"),

  get: (id: string) => http.get<{ team: Team }>(`/api/teams/${id}`),

  create: (data: TeamInput) =>
    http.post<{ message: string; team: Team }>("/api/teams", data),

  update: (id: string, data: Partial<TeamInput>) =>
    http.patch<{ message: string; team: Team }>(`/api/teams/${id}`, data),

  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/teams/${id}`),

  availableUsers: (id: string) =>
    http.get<{ count: number; users: { id: string; name: string; email: string }[] }>(
      `/api/teams/${id}/available-users`
    ),

  addMember: (teamId: string, userId: string) =>
    http.post<{ message: string; member: TeamMember }>(
      `/api/teams/${teamId}/members`,
      { userId }
    ),

  removeMember: (teamId: string, userId: string) =>
    http.delete<{ message: string; teamId: string; userId: string }>(
      `/api/teams/${teamId}/members/${userId}`
    ),
};