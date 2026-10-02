// routes/admin/wallets.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Wallet as WalletIcon, TrendingUp,
  Lock, Banknote, Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { http } from "@/lib/api";

export const Route = createFileRoute("/admin/wallets")({
  head: () => ({ meta: [{ title: "Admin · Wallets — StyleAI" }] }),
  component: AdminWalletsPage,
});

interface Stats {
  platformRevenue: { brandFees: number; influencerFees: number; total: number; currency: string };
  volume: number;
  escrow: { count: number; amount: number };
  withdrawals: { pendingCount: number; pendingAmount: number };
  wallets: { users: number; organizations: number; influencers: number; total: number; totalBalanceHeld: number };
}

interface WalletRow {
  id: string;
  currency: string;
  balance: number;
  ownerType: "user" | "organization" | "influencer";
  owner: { id: string; name: string; email: string };
  updatedAt: string;
}

function AdminWalletsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownerType, setOwnerType] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, w] = await Promise.all([
        http.get<{ stats: Stats }>("/api/wallet/admin/stats"),
        http.get<{ wallets: WalletRow[]; total: number }>(
          `/api/wallet/admin/wallets?limit=200${ownerType ? `&ownerType=${ownerType}` : ""}`
        ),
      ]);
      setStats(s.stats);
      setWallets(w.wallets);
    } catch (e: any) {
      setError(e?.message || "Failed to load wallet dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ownerType]);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Admin", "Wallets"]}>
        <PageHeader
          eyebrow="Super admin"
          title="Wallet overview"
          description="Platform revenue, escrow, and every wallet on the platform."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : stats ? (
          <>
            {/* ===== TOP STATS ===== */}
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={TrendingUp}
                label="Platform revenue"
                value={`${stats.platformRevenue.currency} ${stats.platformRevenue.total.toFixed(2)}`}
                note={`Brand ${stats.platformRevenue.brandFees.toFixed(2)} · Creator ${stats.platformRevenue.influencerFees.toFixed(2)}`}
              />
              <StatCard
                icon={WalletIcon}
                label="Total volume"
                value={`${stats.platformRevenue.currency} ${stats.volume.toFixed(2)}`}
                note="All released offers"
              />
              <StatCard
                icon={Lock}
                label="In escrow"
                value={`${stats.platformRevenue.currency} ${stats.escrow.amount.toFixed(2)}`}
                note={`${stats.escrow.count} active holds`}
              />
              <StatCard
                icon={Banknote}
                label="Pending withdrawals"
                value={`${stats.platformRevenue.currency} ${stats.withdrawals.pendingAmount.toFixed(2)}`}
                note={`${stats.withdrawals.pendingCount} awaiting approval`}
              />
            </section>

            {/* ===== WALLET COUNT BREAKDOWN ===== */}
            <section className="mt-4 grid gap-4 sm:grid-cols-3">
              <MiniCard label="User wallets" value={stats.wallets.users} />
              <MiniCard label="Organization wallets" value={stats.wallets.organizations} />
              <MiniCard label="Influencer wallets" value={stats.wallets.influencers} />
            </section>

            {/* ===== WALLET LIST ===== */}
            <Panel className="mt-8 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-accent" />
                  <h3 className="text-sm font-medium">All wallets</h3>
                  <span className="text-xs text-muted-foreground">({wallets.length})</span>
                </div>
                <select
                  value={ownerType}
                  onChange={(e) => setOwnerType(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="">All owners</option>
                  <option value="user">Users</option>
                  <option value="organization">Organizations</option>
                  <option value="influencer">Influencers</option>
                </select>
              </div>

              {wallets.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No wallets yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="p-3 font-medium">Owner</th>
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium text-right">Balance</th>
                        <th className="p-3 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {wallets.map((w) => (
                        <tr key={w.id}>
                          <td className="p-3">
                            <p className="font-medium">{w.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{w.owner.email}</p>
                          </td>
                          <td className="p-3">
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
                              {w.ownerType}
                            </span>
                          </td>
                          <td className="p-3 text-right tabular-nums font-medium">
                            {w.currency} {w.balance.toFixed(2)}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(w.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        ) : null}
      </AppShell>
    </ProtectedRoute>
  );
}

function StatCard({
  icon: Icon, label, value, note,
}: { icon: typeof WalletIcon; label: string; value: string; note: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-accent/15 text-accent">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-3 font-display text-2xl font-medium tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function MiniCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-medium tabular-nums">{value}</p>
    </div>
  );
}