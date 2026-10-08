import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Check, X, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { withdrawalsApi, type WithdrawalRow } from "@/lib/wallet";
import { swalError } from "@/lib/swal";

export const Route = createFileRoute("/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Admin · Withdrawals — StyleAI" }] }),
  component: AdminWithdrawalsPage,
});

function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("PENDING");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params: { limit: number; status?: string } = { limit: 200 };
        if (status) params.status = status;
        const r = await withdrawalsApi.list(params);
      setRows(r.withdrawals);
    } catch (e: any) {
      setError(e?.message || "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  async function act(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      await withdrawalsApi.review(id, { decision });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      swalError(e?.message || "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader
          eyebrow="Super admin"
          title="Withdrawals"
          description="Approve or reject payout requests from influencers and owners."
        />

        <div className="mt-6">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Rejected</option>
            <option value="">All</option>
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
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <Banknote className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No withdrawals in this state.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Requester</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Destination</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Requested</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className={busy === r.id ? "opacity-50" : ""}>
                    <td className="p-3">
                      <p className="font-medium">{r.owner.name}</p>
                      <p className="text-xs text-muted-foreground">{r.owner.email}</p>
                    </td>
                    <td className="p-3 tabular-nums">
                      {r.currency} {Math.abs(r.amount).toFixed(2)}
                    </td>
                    <td className="p-3 uppercase text-xs text-muted-foreground">{r.method}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.destination}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        r.status === "PENDING" ? "bg-amber-500/15 text-amber-500"
                        : r.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {r.status === "PENDING" ? (
                        <div className="flex justify-end gap-1">
                          <TooltipIconButton
                            label="Reject withdrawal"
                            disabled={busy === r.id}
                            onClick={() => act(r.id, "reject")}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="size-4" />
                          </TooltipIconButton>
                          <TooltipIconButton
                            label="Approve & pay out"
                            disabled={busy === r.id}
                            onClick={() => act(r.id, "approve")}
                            className="text-emerald-500 hover:text-emerald-500"
                          >
                            <Check className="size-4" />
                          </TooltipIconButton>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </>
    </ProtectedRoute>
  );
}