import { swalError , swalConfirm } from "@/lib/swal";
// routes/admin/users.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Users, AlertCircle, UserX, UserCheck, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

const ROLES = ["SUPER_ADMIN", "BRAND_OWNER", "BRAND_TEAM_MEMBER", "INFLUENCER", "AGENCY", "SHOPPER"];

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      // Build params conditionally (exactOptionalPropertyTypes)
      const params: { search?: string; role?: string; limit: number } = { limit: 100 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await adminApi.listUsers(params);
      setUsers(res.users);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Platform"
          title="All users"
          description="Manage every account across the platform. Restrict or reactivate access, or delete permanently."
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
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
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No users found.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Roles</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 font-medium">{u.name}</td>
                      <td className="py-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3">
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
                      <td className="py-3">
                        <span className={u.isActive ? "text-xs text-emerald-500" : "text-xs text-destructive"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.isActive ? (
                            <TooltipIconButton
                              label="Restrict account (blocks login)"
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
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </>
    </ProtectedRoute>
  );
}