import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adminApi } from "@/lib/admin";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.listPayments({ limit: 100 })
      .then((res) => { setPayments(res.payments); setRevenue(res.totalRevenue); })
      .catch((err) => setError(err?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <>
        <PageHeader eyebrow="Finance" title="Payments" description="All transactions across organizations." />

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-accent" />
              <p className="text-xs font-medium uppercase text-muted-foreground">Total revenue</p>
            </div>
            <p className="mt-3 font-display text-3xl font-medium tabular-nums">${revenue.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-accent" />
              <p className="text-xs font-medium uppercase text-muted-foreground">Transactions</p>
            </div>
            <p className="mt-3 font-display text-3xl font-medium tabular-nums">{payments.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-accent" />
              <p className="text-xs font-medium uppercase text-muted-foreground">Pending</p>
            </div>
            <p className="mt-3 font-display text-3xl font-medium tabular-nums">
              {payments.filter((p) => p.status === "PENDING").length}
            </p>
          </div>
        </section>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading payments…</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <CreditCard className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No payments recorded.</p>
          </div>
        ) : (
          <Panel className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Provider</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 font-medium">{p.organization?.name ?? "—"}</td>
                      <td className="py-3 tabular-nums">{p.currency} {p.amount}</td>
                      <td className="py-3">
                        <span className={
                          p.status === "SUCCEEDED" ? "text-xs text-emerald-500" :
                          p.status === "PENDING" ? "text-xs text-amber-500" :
                          "text-xs text-destructive"
                        }>{p.status}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{p.provider}</td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
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