import { swalError , swalConfirm } from "@/lib/swal";
// routes/billing.tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  AlertCircle, Loader2, CreditCard, Check, Sparkles,
  CheckCircle2, XCircle, Clock, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle } from '@/components/ui-kit';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PaymentMethodPicker } from '@/components/payments/PaymentMethodPicker';
import { UsageBar } from '@/components/billing/UsageBar';
import { billingApi, type BillingMeResponse, type Plan, type BillingRole } from '@/lib/billing';
import {
  paymentsApi,
  executeCheckout,
  type PaymentProvider,
} from '@/lib/payments';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/billing')({
  head: () => ({ meta: [{ title: 'Billing — StyleAI' }] }),
  component: BillingPage,
});

function BillingPage() {
  const [data, setData] = useState<BillingMeResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [showPlans, setShowPlans] = useState(false);

  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const me = await billingApi.getMe();
      setData(me);

      const role = me.role as BillingRole | null;
      const plansResp = await billingApi.getPlans(role || undefined);
      if (Array.isArray(plansResp.plans)) {
        setPlans(plansResp.plans);
      } else {
        const map = plansResp.plans as Record<string, Plan[]>;
        setPlans(role ? map[role] || [] : []);
      }

      try {
        const methods = await paymentsApi.getMethods('SUBSCRIPTION');
        setProviders(methods.providers);
        if (!selectedProvider && methods.providers.length) {
          setSelectedProvider(methods.providers[0]);
        }
      } catch { /* ignore */ }
    } catch (e: any) {
      setError(e?.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function upgrade(planName: string) {
    if (!selectedProvider) {
      setError('Please choose a payment method first.');
      return;
    }
    if (!(await swalConfirm(`Switch to ${planName} (${cycle.toLowerCase()}) via ${selectedProvider}?`))) return;

    setBusy(planName);
    setError('');
    setOk('');
    try {
      const session = await paymentsApi.createSubscriptionCheckout({
        planName,
        cycle,
        provider: selectedProvider,
      });
      executeCheckout(session, selectedProvider);
      if (session.method === 'NONE') {
        setOk(`Switched to ${planName}`);
        await load();
      }
    } catch (e: any) {
      setError(e?.message || 'Upgrade failed');
      setBusy(null);
    }
  }

  async function cancel() {
    if (!(await swalConfirm('Cancel at end of current period?'))) return;
    setBusy('cancel');
    try {
      await billingApi.cancel();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Cancel failed');
    } finally {
      setBusy(null);
    }
  }

  async function resume() {
    setBusy('resume');
    try {
      await billingApi.resume();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Resume failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteInvoice(id: string) {
    if (!(await swalConfirm('Delete this failed invoice?'))) return;
    setDeletingId(id);
    try {
      await billingApi.deleteInvoice(id);
      await load();
    } catch (e: any) {
      swalError(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAllFailed() {
    const failedCount = data?.invoices.filter((i) => i.status === 'FAILED').length ?? 0;
    if (!failedCount) return;
    if (!(await swalConfirm(`Delete all ${failedCount} failed invoice${failedCount === 1 ? '' : 's'}?`))) return;
    setDeletingAll(true);
    try {
      await billingApi.deleteAllFailed();
      await load();
    } catch (e: any) {
      swalError(e?.message || 'Bulk delete failed');
    } finally {
      setDeletingAll(false);
    }
  }

  const sub = data?.subscription;
  const isTrial = sub?.isTrial;
  const trialDaysLeft = sub?.trialDaysLeft ?? 0;
  const state = sub?.effectiveState;
  const isFree = sub?.planName === 'free';
  const isAdmin = data?.isAdmin;
  const failedCount = data?.invoices.filter((i) => i.status === 'FAILED').length ?? 0;

  // ======================================================
  // ADMIN — no billing
  // ======================================================
  if (isAdmin) {
    return (
      <ProtectedRoute roles={['SUPER_ADMIN']} skipTrialCheck>
        <PageHeader
          eyebrow="Administration"
          title="Billing"
          description="Admin accounts have full access and no billing."
        />
        <Panel className="mt-8">
          <p className="text-sm text-muted-foreground">
            As a SUPER_ADMIN, you have platform-wide access. No subscription required.
          </p>
        </Panel>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['BRAND_OWNER', 'AGENCY', 'INFLUENCER']} skipTrialCheck>
      <PageHeader
        eyebrow="Administration"
        title="Billing"
        description="Manage your plan, review invoices, and update payment method."
        actions={
          <Button onClick={() => setShowPlans((s) => !s)}>
            <Sparkles className="mr-1.5 size-4" />
            {showPlans ? 'Hide plans' : (isTrial ? 'Upgrade now' : isFree ? 'Upgrade' : 'Change plan')}
          </Button>
        }
      />

      {/* Trial banner */}
      {isTrial && state === 'trial' && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Free trial — {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upgrade before your trial ends to keep using all features.
            </p>
          </div>
        </div>
      )}

      {/* Trial expired banner */}
      {state === 'trial_expired' && (
        <div className="mt-6 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Trial expired</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose a plan to resume using StyleAI.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowPlans(true)}>Choose plan</Button>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {ok && (
        <div className="mt-6 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
          <CheckCircle2 className="size-4 shrink-0" /> <span>{ok}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading billing…</span>
        </div>
      ) : !data ? null : (
        <>
          {/* Payment method + cycle */}
          {showPlans && (
            <Panel className="mt-6">
              <SectionTitle
                title="Payment method"
                description="Choose how you want to be charged."
              />
              <PaymentMethodPicker
                value={selectedProvider}
                onChange={setSelectedProvider}
                allowed={providers}
              />

              <div className="mt-5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Billing cycle
                </label>
                <div className="mt-2 flex gap-2">
                  {(['MONTHLY', 'YEARLY'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCycle(c)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-xs font-medium',
                        cycle === c
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {c === 'MONTHLY' ? 'Monthly' : 'Yearly (save ~2 months)'}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {/* Plan picker */}
          {showPlans && plans.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => {
                const current = sub?.planName === p.name;
                const isTrialPlan = p.isTrial;
                return (
                  <article
                    key={p.name}
                    className={cn(
                      'flex flex-col rounded-xl border bg-card p-5',
                      current ? 'border-accent ring-1 ring-accent' : 'border-border',
                      p.popular && !current && 'border-accent/40'
                    )}
                  >
                    {p.popular && (
                      <span className="mb-2 inline-flex w-fit rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                        MOST POPULAR
                      </span>
                    )}
                    <h3 className="font-display text-xl font-medium">{p.label}</h3>
                    {p.tagline && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{p.tagline}</p>
                    )}
                    <p className="mt-3 text-sm">
                      {p.priceMonthly === null
                        ? 'Contact sales'
                        : p.priceMonthly === 0
                        ? (isTrialPlan ? 'Free trial' : 'Free')
                        : `${p.currency} ${(cycle === 'YEARLY' ? p.priceYearly : p.priceMonthly)?.toLocaleString()}/${cycle === 'YEARLY' ? 'yr' : 'mo'}`}
                    </p>
                    {p.takeRate != null && p.takeRate > 0 && (
                      <p className="mt-1 text-[10px] text-accent">
                        Platform fee: {(p.takeRate * 100).toFixed(1)}%
                      </p>
                    )}

                    <ul className="mt-4 flex-1 space-y-2 text-xs">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="mt-4 w-full"
                      variant={current ? 'outline' : 'default'}
                      disabled={current || isTrialPlan || busy === p.name || !selectedProvider}
                      onClick={() => upgrade(p.name)}
                    >
                      {current
                        ? 'Current plan'
                        : isTrialPlan
                        ? 'Trial used'
                        : busy === p.name
                        ? <><Loader2 className="mr-2 size-4 animate-spin" />Redirecting…</>
                        : `Switch to ${p.label}`}
                    </Button>
                  </article>
                );
              })}
            </div>
          )}

          {/* Current plan + Usage + Invoices */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Panel>
              <SectionTitle
                title="Current plan"
                description="Renews automatically unless cancelled."
              />
              <div className="flex items-center justify-between">
                <p className="font-display text-3xl font-medium">
                  {data.plan?.label || '—'}
                </p>
                {state === 'trial' && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-500">
                    Trial
                  </span>
                )}
                {state === 'active' && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-500">
                    Active
                  </span>
                )}
                {state === 'trial_expired' && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase text-destructive">
                    Expired
                  </span>
                )}
              </div>

              {data.plan?.priceMonthly != null && data.plan.priceMonthly > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.plan.currency} {data.plan.priceMonthly.toLocaleString()} / month
                </p>
              )}

              {sub?.currentPeriodEnd && (
                <p className="mt-4 text-xs text-muted-foreground">
                  {sub.cancelAtPeriodEnd
                    ? `Access ends ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                    : isTrial
                    ? `Trial ends ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {sub?.cancelAtPeriodEnd ? (
                  <Button variant="outline" onClick={resume} disabled={busy === 'resume'}>
                    Resume subscription
                  </Button>
                ) : (
                  !isTrial && !isFree && (
                    <Button variant="outline" onClick={cancel} disabled={busy === 'cancel'}>
                      Cancel plan
                    </Button>
                  )
                )}
                <Button variant="ghost" onClick={() => setShowPlans(true)}>
                  {isTrial ? 'Upgrade now' : isFree ? 'Upgrade' : 'Change plan'}
                </Button>
              </div>

              <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-3.5" />
                  <span>
                    Payment methods:{' '}
                    <strong className="text-foreground">
                      {providers.length ? providers.join(' · ') : 'None available'}
                    </strong>
                  </span>
                </div>
              </div>
            </Panel>

            <div className="space-y-6">
              {/* Usage panel */}
              {data.usage && data.plan?.limits && (
                <Panel>
                  <SectionTitle
                    title="Usage this period"
                    description="Resets at the start of each billing cycle."
                    action={
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {data.role}
                      </span>
                    }
                  />
                  <div className="space-y-4">
                    {data.plan.limits.aiTextPerMonth !== undefined && (
                      <UsageBar
                        label="AI text calls"
                        used={data.usage.used.aiTextCalls}
                        limit={data.plan.limits.aiTextPerMonth}
                      />
                    )}
                    {data.plan.limits.aiImagePerMonth !== undefined && (
                      <UsageBar
                        label="AI image calls"
                        used={data.usage.used.aiImageCalls}
                        limit={data.plan.limits.aiImagePerMonth}
                      />
                    )}
                    {data.plan.limits.assistantMessages !== undefined && (
                      <UsageBar
                        label="Assistant messages"
                        used={data.usage.used.aiAssistMessages}
                        limit={data.plan.limits.assistantMessages}
                      />
                    )}
                    {data.plan.limits.campaignsPerMonth !== undefined && (
                      <UsageBar
                        label="Campaigns"
                        used={data.usage.used.campaignsCreated}
                        limit={data.plan.limits.campaignsPerMonth}
                      />
                    )}
                  </div>
                </Panel>
              )}

              {/* Invoices */}
              <Panel className="overflow-hidden">
                <SectionTitle
                  title="Invoices"
                  description={`${data.invoices.length} invoice${data.invoices.length === 1 ? '' : 's'}`}
                  action={
                    failedCount > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={handleDeleteAllFailed}
                        disabled={deletingAll}
                        title={`Delete all ${failedCount} failed invoices`}
                      >
                        {deletingAll ? (
                          <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Deleting…</>
                        ) : (
                          <><Trash2 className="mr-1.5 size-3.5" /> Clear {failedCount} failed</>
                        )}
                      </Button>
                    ) : null
                  }
                />
                {data.invoices.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs text-muted-foreground">No invoices yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-3 font-medium">Invoice</th>
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium text-right">Amount</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium text-right w-12"> </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-3 font-mono text-xs">
                              {inv.invoiceNumber.length > 40
                                ? `${inv.invoiceNumber.slice(0, 40)}…`
                                : inv.invoiceNumber}
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-right tabular-nums font-medium">
                              {inv.currency} {inv.amount.toFixed(2)}
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                                inv.status === 'SUCCEEDED' ? 'bg-emerald-500/15 text-emerald-500'
                                : inv.status === 'PENDING' ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-destructive/15 text-destructive'
                              )}>
                                {inv.status === 'SUCCEEDED' ? <CheckCircle2 className="size-3" /> : inv.status === 'FAILED' ? <XCircle className="size-3" /> : null}
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {inv.status === 'FAILED' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  disabled={deletingId === inv.id}
                                  title="Delete this failed invoice"
                                >
                                  {deletingId === inv.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3.5" />
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}