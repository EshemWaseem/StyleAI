import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, FileClock } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { auditApi, type AuditRow } from "@/lib/admin/finance";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Admin · Audit — StyleAI" }] }),
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await auditApi.list({
        action: action || undefined,
        targetType: targetType || undefined,
        limit: 200,
      });
      setLogs(r.logs);
    } catch (e: any) {
      setError(e?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [action, targetType]);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Super admin"
          title="Audit log"
          description="Every admin action, state change, and money move — immutably recorded."
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All actions</option>
            <option value="offer.">offer.*</option>
            <option value="wallet.">wallet.*</option>
            <option value="finance.">finance.*</option>
            <option value="settings.">settings.*</option>
            <option value="user.">user.*</option>
          </select>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All targets</option>
            <option value="CustomOffer">CustomOffer</option>
            <option value="WalletTransaction">WalletTransaction</option>
            <option value="PlatformSetting">PlatformSetting</option>
            <option value="User">User</option>
          </select>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <FileClock className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No audit entries yet.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">When</th>
                    <th className="p-3 font-medium">Actor</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-xs">{l.actor.name}</p>
                        <p className="text-[10px] text-muted-foreground">{l.actor.email}</p>
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {l.action}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {l.targetType} · <span className="font-mono">{l.targetId.slice(0, 8)}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {l.meta ? (
                          <details>
                            <summary className="cursor-pointer hover:text-foreground">view</summary>
                            <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-muted/30 p-2 text-[10px]">
                              {JSON.stringify(l.meta, null, 2)}
                            </pre>
                          </details>
                        ) : "—"}
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