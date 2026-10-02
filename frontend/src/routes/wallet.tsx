// routes/wallet.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet as WalletIcon, AlertCircle, Loader2, ArrowDownRight, ArrowUpRight,
  Lock, Unlock, RotateCcw, Coins, ExternalLink, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { walletApi } from "@/lib/wallet";
import type { Wallet, WalletTransaction, WalletTxType } from "@/lib/wallet";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — StyleAI" }] }),
  component: WalletPage,
});

function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [w, t] = await Promise.all([
        walletApi.getMe(),
        walletApi.listTransactions({ limit: 100 }),
      ]);
      setWallet(w.wallet);
      setTxns(t.transactions || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <ProtectedRoute>
      <PageHeader
        eyebrow="Finances"
        title="Wallet"
        description="Balance, escrow, and every transaction — nothing hidden."
      />

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading wallet…</span>
        </div>
      ) : !wallet ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
          <WalletIcon className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Wallet not available yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your wallet will be created automatically on your first transaction.
          </p>
        </div>
      ) : (
        <>
          <Panel className="mt-8 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Available balance
                </p>
                <p className="mt-2 font-display text-4xl font-medium tabular-nums">
                  {wallet.currency} {wallet.balance.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last updated {new Date(wallet.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <WalletIcon className="size-5" />
              </div>
            </div>

            {wallet.balance > 0 && (
              <div className="mt-5">
                <Button onClick={() => setShowWithdraw(true)}>
                  <ArrowUpRight className="mr-2 size-4" /> Withdraw funds
                </Button>
              </div>
            )}
          </Panel>

          <Panel className="mt-6 overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-medium">Transaction history</h3>
            </div>

            {txns.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Coins className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No transactions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every escrow hold, payout, and refund will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Note</th>
                      <th className="p-3 font-medium text-right">Amount</th>
                      <th className="p-3 font-medium text-right">Balance after</th>
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium text-right">Offer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {txns.map((t) => (
                      <tr key={t.id}>
                        <td className="p-3"><TxBadge type={t.type} /></td>
                        <td className="p-3 text-muted-foreground">{t.note || "—"}</td>
                        <td className={`p-3 text-right tabular-nums ${t.amount >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                          {t.amount >= 0 ? "+" : ""}
                          {t.currency} {t.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                          {t.currency} {t.balanceAfter.toFixed(2)}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          {t.offerId ? (
                            <Link
                              to="/offers/$id"
                              params={{ id: t.offerId }}
                              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                            >
                              View <ExternalLink className="size-3" />
                            </Link>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {showWithdraw && (
            <WithdrawModal
              availableBalance={wallet.balance}
              currency={wallet.currency}
              minAmount={50}
              onClose={() => setShowWithdraw(false)}
              onSubmitted={() => { setShowWithdraw(false); load(); }}
            />
          )}
        </>
      )}
    </ProtectedRoute>
  );
}

function TxBadge({ type }: { type: WalletTxType }) {
  const cfg: Record<WalletTxType, { label: string; cls: string; Icon: any }> = {
    DEPOSIT:              { label: "Deposit",           cls: "bg-emerald-500/15 text-emerald-500", Icon: ArrowDownRight },
    WITHDRAWAL:           { label: "Withdraw",          cls: "bg-amber-500/15 text-amber-500",    Icon: ArrowUpRight },
    OFFER_HOLD:           { label: "Escrow hold",       cls: "bg-blue-500/15 text-blue-500",       Icon: Lock },
    OFFER_RELEASE:        { label: "Payout",            cls: "bg-emerald-500/15 text-emerald-500", Icon: Unlock },
    OFFER_REFUND:         { label: "Refund",            cls: "bg-purple-500/15 text-purple-500",   Icon: RotateCcw },
    PLATFORM_FEE:         { label: "Platform fee",      cls: "bg-muted text-muted-foreground",     Icon: Coins },
    SUBSCRIPTION_INCOME:  { label: "Subscription",      cls: "bg-indigo-500/15 text-indigo-500",   Icon: TrendingUp },
    ADJUSTMENT:           { label: "Adjustment",        cls: "bg-muted text-muted-foreground",     Icon: Coins },
  };
  const { label, cls, Icon } = cfg[type] || cfg.ADJUSTMENT;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      <Icon className="size-3" /> {label}
    </span>
  );
}