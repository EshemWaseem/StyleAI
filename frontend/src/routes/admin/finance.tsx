import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Save, TrendingUp, DollarSign, Lock, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { financeApi, type FinanceRule } from "@/lib/admin/finance";
import { http } from "@/lib/api";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({ meta: [{ title: "Admin · Finance — StyleAI" }] }),
  component: AdminFinancePage,
});

const LABELS: Record<string, { label: string; hint: string; type: "number" | "text" }> = {
  brandCommissionPct: { label: "Brand commission %", hint: "Charged to brands on top of subtotal", type: "number" },
  influencerCommissionPct: { label: "Influencer commission %", hint: "Deducted from creator payout", type: "number" },
  bulkDiscountThreshold: { label: "Bulk discount threshold", hint: "Min quantity to trigger discount", type: "number" },
  bulkDiscountPct: { label: "Bulk discount %", hint: "Discount when threshold is met", type: "number" },
  influencerBonusThreshold: { label: "Bonus threshold", hint: "Campaigns needed for creator bonus", type: "number" },
  influencerBonusPct: { label: "Bonus %", hint: "Bonus rate on qualifying campaigns", type: "number" },
  minWithdrawalAmount: { label: "Min withdrawal", hint: "Floor for payout requests", type: "number" },
  payoutHoldDays: { label: "Payout hold days", hint: "Days escrow held before payout", type: "number" },
  currency: { label: "Default currency", hint: "ISO code (USD, PKR, AED…)", type: "text" },
};

interface Stats {
  platformRevenue: { brandFees: number; influencerFees: number; total: number; currency: string };
  volume: number;
  escrow: { count: number; amount: number };
}

function AdminFinancePage() {
  const [rules, setRules] = useState<FinanceRule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [edited, setEdited] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    Promise.all([
      financeApi.getRules(),
      http.get<{ stats: Stats }>("/api/wallet/admin/stats"),
    ])
      .then(([r, s]) => {
        setRules(r.rules);
        setStats(s.stats);
      })
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  function update(key: string, value: any) {
    setEdited((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (Object.keys(edited).length === 0) return;
    setSaving(true);
    setError("");
    setOkMsg("");
    try {
      const r = await financeApi.updateRules(edited);
      setRules(r.rules);
      setEdited({});
      setOkMsg("Finance rules updated — new offers will use the new rates. Existing offers keep their original rate.");
      setTimeout(() => setOkMsg(""), 5000);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Live preview of example offer using currently-edited rates
  const brandPct = Number(edited.brandCommissionPct ?? rules.find((r) => r.key === "brandCommissionPct")?.value ?? 5);
  const infPct = Number(edited.influencerCommissionPct ?? rules.find((r) => r.key === "influencerCommissionPct")?.value ?? 5);
  const sample = 1000;
  const brandFee = Math.round(sample * (brandPct / 100) * 100) / 100;
  const subAfter = sample - brandFee;
  const infFee = Math.round(subAfter * (infPct / 100) * 100) / 100;
  const creatorGets = Math.round((subAfter - infFee) * 100) / 100;
  const platformKeeps = Math.round((brandFee + infFee) * 100) / 100;

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Admin", "Finance"]}>
        <PageHeader
          eyebrow="Super admin"
          title="Finance rules"
          description="Commission, discounts, bonuses, and payout controls. New offers use these rates immediately; existing offers keep the rate they were created with."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {okMsg && (
          <div className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {okMsg}
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            {/* ========== LIVE PLATFORM REVENUE ========== */}
            {stats && (
              <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={TrendingUp}
                  label="Platform revenue (all-time)"
                  value={`${stats.platformRevenue.currency} ${stats.platformRevenue.total.toFixed(2)}`}
                  note={`Brand ${stats.platformRevenue.brandFees.toFixed(2)} · Creator ${stats.platformRevenue.influencerFees.toFixed(2)}`}
                />
                <StatCard
                  icon={DollarSign}
                  label="Total volume"
                  value={`${stats.platformRevenue.currency} ${stats.volume.toFixed(2)}`}
                  note="All released offers"
                />
                <StatCard
                  icon={Lock}
                  label="In escrow (right now)"
                  value={`${stats.platformRevenue.currency} ${stats.escrow.amount.toFixed(2)}`}
                  note={`${stats.escrow.count} active holds`}
                />
                <StatCard
                  icon={Users}
                  label="Your rate split"
                  value={`${brandPct}% / ${infPct}%`}
                  note="Brand side / creator side"
                />
              </section>
            )}

            {/* ========== COMMISSION + LIVE PREVIEW ========== */}
            <Panel className="mt-8">
              <SectionTitle
                title="Commission & fees"
                description="Dual-commission model. Brand fee adds on top; influencer fee deducts from payout."
                action={<TrendingUp className="size-4 text-muted-foreground" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {["brandCommissionPct", "influencerCommissionPct"].map((key) => (
                  <RuleField key={key} ruleKey={key} rules={rules} edited={edited} onChange={update} />
                ))}
              </div>

              {/* Live preview */}
              <div className="mt-6 rounded-lg border border-accent/20 bg-accent/5 p-4">
                <p className="text-xs font-medium text-foreground">
                  Live preview — $1,000 sample offer with your current rates
                </p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <Row label="Brand pays (base)" value={`$${sample.toFixed(2)}`} />
                  <Row
                    label={`Brand fee (${brandPct}%)`}
                    value={`+ $${brandFee.toFixed(2)}`}
                    muted
                  />
                  <Row
                    label="Subtotal after brand fee"
                    value={`$${subAfter.toFixed(2)}`}
                  />
                  <Row
                    label={`Creator fee (${infPct}%)`}
                    value={`− $${infFee.toFixed(2)}`}
                    muted
                  />
                  <Row
                    label="Creator receives"
                    value={`$${creatorGets.toFixed(2)}`}
                    bold
                  />
                  <div className="mt-2 border-t border-accent/20 pt-2">
                    <Row
                      label="Platform revenue"
                      value={`$${platformKeeps.toFixed(2)}`}
                      bold
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel className="mt-6">
              <SectionTitle title="Discounts & bonuses" description="Bulk-buy incentives and creator reward thresholds." />
              <div className="grid gap-4 sm:grid-cols-2">
                {["bulkDiscountThreshold", "bulkDiscountPct", "influencerBonusThreshold", "influencerBonusPct"].map((key) => (
                  <RuleField key={key} ruleKey={key} rules={rules} edited={edited} onChange={update} />
                ))}
              </div>
            </Panel>

            <Panel className="mt-6">
              <SectionTitle title="Payouts" description="Withdrawal floors and escrow hold periods." />
              <div className="grid gap-4 sm:grid-cols-2">
                {["minWithdrawalAmount", "payoutHoldDays", "currency"].map((key) => (
                  <RuleField key={key} ruleKey={key} rules={rules} edited={edited} onChange={update} />
                ))}
              </div>
            </Panel>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Changes apply to <strong className="text-foreground">new offers only</strong>. Existing offers keep their original snapshot rate.
              </p>
              <Button onClick={save} disabled={saving || Object.keys(edited).length === 0}>
                {saving ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="mr-2 size-4" /> Save changes</>
                )}
              </Button>
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function StatCard({
  icon: Icon, label, value, note,
}: { icon: typeof TrendingUp; label: string; value: string; note: string }) {
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

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-medium" : ""}`}>{value}</span>
    </div>
  );
}

function RuleField({
  ruleKey, rules, edited, onChange,
}: {
  ruleKey: string;
  rules: FinanceRule[];
  edited: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const meta = LABELS[ruleKey] || { label: ruleKey, hint: "", type: "number" as const };
  const current = edited[ruleKey] ?? rules.find((r) => r.key === ruleKey)?.value ?? "";

  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {meta.label}
      </label>
      <input
        type={meta.type}
        step={meta.type === "number" ? "0.01" : undefined}
        value={current}
        onChange={(e) => onChange(ruleKey, meta.type === "number" ? Number(e.target.value) : e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{meta.hint}</p>
    </div>
  );
}