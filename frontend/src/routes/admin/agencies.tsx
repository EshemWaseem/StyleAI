// admin/agencies.tsx
// frontend/src/routes/admin/agencies.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/agencies")({
  component: AdminAgenciesPage,
});

function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.listAgencies({ limit: 100 })
      .then((res) => setAgencies(res.agencies))
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Admin", "Agencies"]}>
        {/* <PageHeader eyebrow="Platform" title="All agencies" description="Agencies managing multiple brands." /> */}

        <PageHeader
            eyebrow="Platform"
            title="All agencies"
            description="Agencies managing multiple brands. Read-only view."
          />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading agencies…</span>
          </div>
        ) : agencies.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Briefcase className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No agencies found.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Agency</th>
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {agencies.map((a) => (
                    <tr key={a.userId}>
                      <td className="py-3">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </td>
                      <td className="py-3 text-muted-foreground">{a.organization?.name ?? "—"}</td>
                      <td className="py-3">
                        <span className={a.isActive ? "text-xs text-emerald-500" : "text-xs text-destructive"}>
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}