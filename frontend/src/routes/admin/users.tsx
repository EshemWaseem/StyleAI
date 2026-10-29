// src/routes/admin/users.tsx
import { swalError, swalConfirm, swalSuccess } from "@/lib/swal";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search, Users, AlertCircle, UserX, UserCheck, Trash2, Loader2,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { adminApi } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

const ROLES = ["SUPER_ADMIN", "BRAND_OWNER", "BRAND_TEAM_MEMBER", "INFLUENCER", "AGENCY", "SHOPPER"];

type ApprovalFilter = "" | "PENDING" | "APPROVED" | "REJECTED";

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      // If approval filter set, use dedicated endpoint
      if (approvalFilter === "PENDING") {
        const res = await adminApi.listPendingApprovals({
          role: roleFilter || undefined,
          search: search || undefined,
        });
        setUsers(res.users);
      } else {
        const params: any = { limit: 100 };
        if (search) params.search = search;
        if (roleFilter) params.role = roleFilter;
        if (approvalFilter) params.adminApprovalStatus = approvalFilter;
        const res = await adminApi.listUsers(params);
        setUsers(res.users);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [approvalFilter]);

  async function toggleActive(u: any) {
    try {
      if (u.isActive) await adminApi.deactivateUser(u.id);
      else await adminApi.activateUser(u.id);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    } catch (err: any) { swalError(err?.message); }
  }

  async function handleDelete(u: any) {
    if (!(await swalConfirm(`Delete ${u.email}? This cannot be undone.`))) return;
    try {
      await adminApi.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err: any) { swalError(err?.message); }
  }

  async function handleApprove(u: any) {
    if (!(await swalConfirm(`Approve ${u.name} (${u.email})?`, "They will be able to sign in immediately."))) return;
    setProcessingId(u.id);
    try {
      await adminApi.approveUser(u.id);
      swalSuccess("User approved", `${u.name} can now sign in.`);
      await load();
    } catch (err: any) {
      swalError("Approval failed", err?.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(u: any) {
    const reason = window.prompt(`Rejection reason for ${u.name} (${u.email})?\n\nThis will be sent to the user.`);
    if (reason === null) return;
    if (!reason.trim()) {
      swalError("Reason required", "Please provide a rejection reason.");
      return;
    }
    setProcessingId(u.id);
    try {
      await adminApi.rejectUser(u.id, reason.trim());
      swalSuccess("User rejected", "They will be notified.");
      await load();
    } catch (err: any) {
      swalError("Rejection failed", err?.message);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <div className="w-full max-w-full flex flex-col gap-6 pb-12">
        <PageHeader
          eyebrow="Platform"
          title="All users"
          description="Approve new signups, restrict or reactivate accounts, and manage access."
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-96">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="w-full bg-transparent outline-none"
            />
          </div>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as ApprovalFilter)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All approvals</option>
            <option value="PENDING">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
          <Button size="sm" onClick={load}>Apply</Button>
        </div>

        {error && (
          <div className="ui-error flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="ui-empty">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No users found.</p>
          </div>
        ) : (
          <Panel className="w-full max-w-full overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Roles</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Approval</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const status = u.adminApprovalStatus || "APPROVED";
                    const busy = processingId === u.id;
                    return (
                      <tr key={u.id}>
                        <td className="p-3 font-medium">{u.name}</td>
                        <td className="p-3 text-muted-foreground">{u.email}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r: string) => (
                              <span
                                key={r}
                                className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent"
                              >
                                {r.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={u.isActive ? "text-xs text-emerald-500" : "text-xs text-destructive"}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                              status === "PENDING" && "bg-amber-500/15 text-amber-500",
                              status === "APPROVED" && "bg-emerald-500/15 text-emerald-500",
                              status === "REJECTED" && "bg-destructive/15 text-destructive"
                            )}
                          >
                            {status === "PENDING" && <Clock className="size-2.5" />}
                            {status === "APPROVED" && <CheckCircle2 className="size-2.5" />}
                            {status === "REJECTED" && <XCircle className="size-2.5" />}
                            {status}
                          </span>
                          {status === "REJECTED" && u.adminApprovalReason && (
                            <p className="mt-1 text-[10px] text-muted-foreground italic">
                              "{u.adminApprovalReason}"
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {status === "PENDING" && (
                              <>
                                <TooltipIconButton
                                  label="Approve — user can sign in"
                                  onClick={() => handleApprove(u)}
                                  className="text-emerald-500 hover:text-emerald-500"
                                >
                                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                </TooltipIconButton>
                                <TooltipIconButton
                                  label="Reject with reason"
                                  onClick={() => handleReject(u)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="size-4" />
                                </TooltipIconButton>
                              </>
                            )}
                            {u.isActive ? (
                              <TooltipIconButton
                                label="Restrict account"
                                onClick={() => toggleActive(u)}
                                className="text-amber-500 hover:text-amber-500"
                              >
                                <UserX className="size-4" />
                              </TooltipIconButton>
                            ) : (
                              <TooltipIconButton
                                label="Reactivate account"
                                onClick={() => toggleActive(u)}
                                className="text-emerald-500 hover:text-emerald-500"
                              >
                                <UserCheck className="size-4" />
                              </TooltipIconButton>
                            )}
                            <TooltipIconButton
                              label="Delete permanently"
                              onClick={() => handleDelete(u)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </TooltipIconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </ProtectedRoute>
  );
}