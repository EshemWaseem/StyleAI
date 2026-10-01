// admin/campaigns.tsx
// frontend/src/routes/admin/campaigns.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/campaigns")({
  component: AdminCampaignsPage,
});

function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.listCampaigns({ limit: 100 })
      .then((res) => { setCampaigns(res.campaigns); setNote((res as any).note || ""); })
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Admin", "Campaigns"]}>
        {/* <PageHeader eyebrow="Platform" title="All campaigns" description="Monitor campaigns across all brands." /> */}
        <PageHeader
              eyebrow="Platform"
              title="All campaigns"
              description="Monitor campaigns across all brands. Read-only."
            />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading campaigns…</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Megaphone className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {note || "No campaigns yet."}
            </p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Campaign</th>
                    <th className="pb-3 font-medium">Brand</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-medium">{c.name}</td>
                      <td className="py-3 text-muted-foreground">{c.brand?.name ?? "—"}</td>
                      <td className="py-3 text-xs">{c.status}</td>
                      <td className="py-3 tabular-nums">{c.budget ?? "—"}</td>
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