// components/dashboard/types.ts
import type { RoleName } from "@/lib/role";

export type WorkspaceKey = "admin" | "owner" | "member" | "influencer" | "agency";

export const ROLE_TO_WORKSPACE: Record<RoleName, WorkspaceKey> = {
  SUPER_ADMIN: "admin",
  BRAND_OWNER: "owner",
  BRAND_TEAM_MEMBER: "member",
  INFLUENCER: "influencer",
  AGENCY: "agency",
  SHOPPER: "owner",
};

export function pickWorkspace(roles: RoleName[]): WorkspaceKey {
  const priority: RoleName[] = [
    "SUPER_ADMIN",
    "AGENCY",
    "BRAND_OWNER",
    "BRAND_TEAM_MEMBER",
    "INFLUENCER",
  ];
  for (const r of priority) {
    if (roles.includes(r)) return ROLE_TO_WORKSPACE[r];
  }
  return "owner";
}

export type Stat = {
  label: string;
  value: string;
  note: string;
  tone?: "success" | "warning";
};

export const roleCopy: Record<
  WorkspaceKey,
  { eyebrow: string; title: string; description: string }
> = {
  admin: {
    eyebrow: "Global control plane",
    title: "Platform command center",
    description: "Monitor every organization, model, and trust signal across StyleAI.",
  },
  influencer: {
    eyebrow: "Creator workspace",
    title: "Your creative business, in motion.",
    description: "Manage brand opportunities, deliverables, earnings, and audience growth.",
  },
  owner: {
    eyebrow: "Brand command",
    title: "Your brand, in motion.",
    description: "Move every product from understanding to measurable growth.",
  },
  agency: {
    eyebrow: "Agency portfolio",
    title: "Your agency, in motion.",
    description: "Balance approvals, creator delivery, and performance across your brand portfolio.",
  },
  member: {
    eyebrow: "My workspace",
    title: "Your priorities for today.",
    description: "Draft, review, and deliver the work assigned to you.",
  },
};

export const roleStats: Record<WorkspaceKey, Stat[]> = {
  admin: [
    { label: "Organizations", value: "—", note: "See /admin", tone: "success" },
    { label: "Active users", value: "—", note: "See /admin" },
    { label: "AI requests", value: "—", note: "See /admin" },
    { label: "Median latency", value: "—", note: "See /admin" },
  ],
  influencer: [
    { label: "Total earnings", value: "—", note: "Loading…" },
    { label: "Active campaigns", value: "—", note: "Loading…" },
    { label: "Completed", value: "—", note: "Loading…" },
    { label: "Total reach", value: "—", note: "Loading…" },
  ],
  owner: [
    { label: "Attributed revenue", value: "—", note: "Loading…", tone: "success" },
    { label: "Campaign ROI", value: "—", note: "Loading…", tone: "success" },
    { label: "Conversions", value: "—", note: "Loading…" },
    { label: "Creator reach", value: "—", note: "Loading…" },
  ],
  agency: [
    { label: "Managed brands", value: "0", note: "See /agency" },
    { label: "Portfolio revenue", value: "—", note: "See /agency" },
    { label: "Active campaigns", value: "0", note: "See /agency" },
    { label: "Approval SLA", value: "—", note: "See /agency" },
  ],
  member: [
    { label: "Assigned to me", value: "—", note: "Coming soon" },
    { label: "Awaiting review", value: "—", note: "Coming soon" },
    { label: "Completed", value: "—", note: "Coming soon" },
    { label: "Team momentum", value: "—", note: "Coming soon" },
  ],
};