// routes/billing.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  AlertCircle, Loader2, CreditCard, Check, Sparkles,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel, SectionTitle } from '@/components/ui-kit';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PaymentMethodPicker } from '@/components/payments/PaymentMethodPicker';
import { billingApi, type BillingMeResponse, type Plan } from '@/lib/billing';
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

  // Payment method selection
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [me, p, methods] = await Promise.all([
        billingApi.getMe(),
        billingApi.getPlans(),
        paymentsApi.getMethods('SUBSCRIPTION'),
      ]);
      setData(me);
      setPlans(p.plans);
      setProviders(methods.providers);
      if (!selectedProvider && methods.providers.length) {
        setSelectedProvider(methods.providers[0]);
      }
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
    if (!confirm(`Switch to ${planName} (${cycle.toLowerCase()}) via ${selectedProvider}?`)) return;

    setBusy(planName);
    setError('');
    setOk('');
    try {
      const session = await paymentsApi.createSubscriptionCheckout({
        planName,
        cycle,
        provider: selectedProvider,
      });
      // Drive the browser to the gateway
      executeCheckout(session, selectedProvider);
      // For COD/no-redirect gateways, reload billing
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
    if (!confirm('Cancel at end of current period?')) return;
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

  return (
    <ProtectedRoute roles={['BRAND_OWNER', 'AGENCY', 'SUPER_ADMIN']}>
      <AppShell breadcrumb={['Administration', 'Billing']}>
        <PageHeader
          eyebrow="Administration"
          title="Billing"
          description="Manage your plan, review invoices, and update payment method."
          actions={
            <Button onClick={() => setShowPlans((s) => !s)}>
              <Sparkles className="mr-1.5 size-4" />
              {showPlans ? 'Hide plans' : 'Change plan'}
            </Button>
          }
        />

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
            {/* Payment method + cycle picker */}
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
            {showPlans && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((p) => {
                  const current = data.subscription.planName === p.name;
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.priceMonthly === null
                          ? 'Contact sales'
                          : p.priceMonthly === 0
                          ? 'Free'
                          : `${p.currency} ${cycle === 'YEARLY' ? p.priceYearly : p.priceMonthly}/${cycle === 'YEARLY' ? 'yr' : 'mo'}`}
                      </p>

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
                        disabled={current || busy === p.name || p.name === 'enterprise' || !selectedProvider}
                        onClick={() => upgrade(p.name)}
                      >
                        {current
                          ? 'Current plan'
                          : p.name === 'enterprise'
                          ? 'Contact sales'
                          : busy === p.name
                          ? <><Loader2 className="mr-2 size-4 animate-spin" />Redirecting…</>
                          : `Switch to ${p.label}`}
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Current plan + Invoices */}
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <Panel>
                <SectionTitle
                  title="Current plan"
                  description="Renews automatically unless cancelled."
                />
                <div className="flex items-center justify-between">
                  <p className="font-display text-3xl font-medium">{data.plan.label}</p>
                  {data.subscription.status === 'ACTIVE' && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-500">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.plan.priceMonthly === null
                    ? 'Custom pricing'
                    : data.plan.priceMonthly === 0
                    ? 'Free forever'
                    : `${data.plan.currency} ${data.plan.priceMonthly} / month`}
                </p>

                {data.subscription.currentPeriodEnd && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {data.subscription.cancelAtPeriodEnd
                      ? `Access ends ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {data.subscription.cancelAtPeriodEnd ? (
                    <Button variant="outline" onClick={resume} disabled={busy === 'resume'}>
                      Resume subscription
                    </Button>
                  ) : (
                    data.subscription.planName !== 'free' && (
                      <Button variant="outline" onClick={cancel} disabled={busy === 'cancel'}>
                        Cancel plan
                      </Button>
                    )
                  )}
                  <Button variant="ghost" onClick={() => setShowPlans(true)}>
                    {data.plan.name === 'free' ? 'Upgrade' : 'Change plan'}
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
                  <p className="mt-1.5 text-[10px]">
                    More methods appear as your account gets enabled for them.
                  </p>
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <SectionTitle
                  title="Invoices"
                  description={`${data.invoices.length} invoice${data.invoices.length === 1 ? '' : 's'}`}
                />
                {data.invoices.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-xs text-muted-foreground">No invoices yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-3 font-medium">Invoice</th>
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium text-right">Amount</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="py-3 font-mono text-xs">{inv.invoiceNumber}</td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}














// // routes/billing.tsx
// import { createFileRoute } from "@tanstack/react-router";
// import { useEffect, useState } from "react";
// import {
//   AlertCircle, Loader2, CreditCard, Check, Sparkles,
//   Download, CheckCircle2, XCircle,
// } from "lucide-react";
// import { AppShell } from "@/components/app-shell";
// import { Button } from "@/components/ui/button";
// import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
// import { ProtectedRoute } from "@/components/ProtectedRoute";
// import { billingApi, type BillingMeResponse, type Plan } from "@/lib/billing";
// import { cn } from "@/lib/utils";

// export const Route = createFileRoute("/billing")({
//   head: () => ({ meta: [{ title: "Billing — StyleAI" }] }),
//   component: BillingPage,
// });

// function BillingPage() {
//   const [data, setData] = useState<BillingMeResponse | null>(null);
//   const [plans, setPlans] = useState<Plan[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [busy, setBusy] = useState<string | null>(null);
//   const [error, setError] = useState("");
//   const [ok, setOk] = useState("");
//   const [showPlans, setShowPlans] = useState(false);

//   async function load() {
//     setLoading(true);
//     setError("");
//     try {
//       const [me, p] = await Promise.all([
//         billingApi.getMe(),
//         billingApi.getPlans(),
//       ]);
//       setData(me);
//       setPlans(p.plans);
//     } catch (e: any) {
//       setError(e?.message || "Failed to load billing");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => { load(); }, []);

//   async function upgrade(planName: string) {
//     if (!confirm(`Switch to ${planName} plan?`)) return;
//     setBusy(planName);
//     setError("");
//     setOk("");
//     try {
//       await billingApi.upgrade(planName, "monthly");
//       setOk(`Upgraded to ${planName}`);
//       setShowPlans(false);
//       await load();
//       setTimeout(() => setOk(""), 3000);
//     } catch (e: any) {
//       setError(e?.message || "Upgrade failed");
//     } finally {
//       setBusy(null);
//     }
//   }

//   async function cancel() {
//     if (!confirm("Cancel at end of current period?")) return;
//     setBusy("cancel");
//     try {
//       await billingApi.cancel();
//       await load();
//     } catch (e: any) {
//       setError(e?.message || "Cancel failed");
//     } finally {
//       setBusy(null);
//     }
//   }

//   async function resume() {
//     setBusy("resume");
//     try {
//       await billingApi.resume();
//       await load();
//     } catch (e: any) {
//       setError(e?.message || "Resume failed");
//     } finally {
//       setBusy(null);
//     }
//   }

//   return (
//     <ProtectedRoute roles={["BRAND_OWNER", "AGENCY", "SUPER_ADMIN"]}>
//       <AppShell breadcrumb={["Administration", "Billing"]}>
//         <PageHeader
//           eyebrow="Administration"
//           title="Billing"
//           description="Manage your plan, review invoices, and update payment method."
//           actions={
//             <Button onClick={() => setShowPlans((s) => !s)}>
//               <Sparkles className="mr-1.5 size-4" />
//               {showPlans ? "Hide plans" : "Change plan"}
//             </Button>
//           }
//         />

//         {error && (
//           <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
//             <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
//           </div>
//         )}
//         {ok && (
//           <div className="mt-6 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
//             <CheckCircle2 className="size-4 shrink-0" /> <span>{ok}</span>
//           </div>
//         )}

//         {loading ? (
//           <div className="mt-16 flex items-center justify-center">
//             <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
//             <span className="text-sm text-muted-foreground">Loading billing…</span>
//           </div>
//         ) : !data ? null : (
//           <>
//             {/* Plan picker */}
//             {showPlans && (
//               <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//                 {plans.map((p) => {
//                   const current = data.subscription.planName === p.name;
//                   return (
//                     <article
//                       key={p.name}
//                       className={cn(
//                         "flex flex-col rounded-xl border bg-card p-5",
//                         current ? "border-accent ring-1 ring-accent" : "border-border",
//                         p.popular && !current && "border-accent/40"
//                       )}
//                     >
//                       {p.popular && (
//                         <span className="mb-2 inline-flex w-fit rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
//                           MOST POPULAR
//                         </span>
//                       )}
//                       <h3 className="font-display text-xl font-medium">{p.label}</h3>
//                       <p className="mt-1 text-xs text-muted-foreground">
//                         {p.priceMonthly === null
//                           ? "Contact sales"
//                           : p.priceMonthly === 0
//                           ? "Free"
//                           : `${p.currency} ${p.priceMonthly}/mo`}
//                       </p>

//                       <ul className="mt-4 flex-1 space-y-2 text-xs">
//                         {p.features.map((f) => (
//                           <li key={f} className="flex items-start gap-2">
//                             <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
//                             <span className="text-muted-foreground">{f}</span>
//                           </li>
//                         ))}
//                       </ul>

//                       <Button
//                         className="mt-4 w-full"
//                         variant={current ? "outline" : "default"}
//                         disabled={current || busy === p.name || p.name === "enterprise"}
//                         onClick={() => upgrade(p.name)}
//                       >
//                         {current
//                           ? "Current plan"
//                           : p.name === "enterprise"
//                           ? "Contact sales"
//                           : busy === p.name
//                           ? <><Loader2 className="mr-2 size-4 animate-spin" />Upgrading…</>
//                           : `Switch to ${p.label}`}
//                       </Button>
//                     </article>
//                   );
//                 })}
//               </div>
//             )}

//             {/* Current plan + Invoices */}
//             <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
//               <Panel>
//                 <SectionTitle
//                   title="Current plan"
//                   description="Renews automatically unless cancelled."
//                 />
//                 <div className="flex items-center justify-between">
//                   <p className="font-display text-3xl font-medium">{data.plan.label}</p>
//                   {data.subscription.status === "ACTIVE" && (
//                     <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-500">
//                       Active
//                     </span>
//                   )}
//                 </div>
//                 <p className="mt-1 text-xs text-muted-foreground">
//                   {data.plan.priceMonthly === null
//                     ? "Custom pricing"
//                     : data.plan.priceMonthly === 0
//                     ? "Free forever"
//                     : `${data.plan.currency} ${data.plan.priceMonthly} / month`}
//                 </p>

//                 {data.subscription.currentPeriodEnd && (
//                   <p className="mt-4 text-xs text-muted-foreground">
//                     {data.subscription.cancelAtPeriodEnd
//                       ? `Access ends ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`
//                       : `Renews ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`}
//                   </p>
//                 )}

//                 <div className="mt-6 flex flex-wrap gap-2">
//                   {data.subscription.cancelAtPeriodEnd ? (
//                     <Button variant="outline" onClick={resume} disabled={busy === "resume"}>
//                       Resume subscription
//                     </Button>
//                   ) : (
//                     data.subscription.planName !== "free" && (
//                       <Button variant="outline" onClick={cancel} disabled={busy === "cancel"}>
//                         Cancel plan
//                       </Button>
//                     )
//                   )}
//                   <Button variant="ghost" onClick={() => setShowPlans(true)}>
//                     {data.plan.name === "free" ? "Upgrade" : "Change plan"}
//                   </Button>
//                 </div>

//                 <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
//                   <div className="flex items-center gap-2">
//                     <CreditCard className="size-3.5" />
//                     <span>Payment method: <strong className="text-foreground">Visa ending 4421</strong></span>
//                   </div>
//                   <p className="mt-1.5 text-[10px]">
//                     Real card management ships with the Stripe integration sprint.
//                   </p>
//                 </div>
//               </Panel>

//               <Panel className="overflow-hidden">
//                 <SectionTitle
//                   title="Invoices"
//                   description={`${data.invoices.length} invoice${data.invoices.length === 1 ? "" : "s"}`}
//                 />
//                 {data.invoices.length === 0 ? (
//                   <div className="py-10 text-center">
//                     <p className="text-xs text-muted-foreground">No invoices yet.</p>
//                   </div>
//                 ) : (
//                   <div className="overflow-x-auto">
//                     <table className="w-full min-w-[500px] text-sm">
//                       <thead>
//                         <tr className="border-b border-border text-left text-xs text-muted-foreground">
//                           <th className="pb-3 font-medium">Invoice</th>
//                           <th className="pb-3 font-medium">Date</th>
//                           <th className="pb-3 font-medium text-right">Amount</th>
//                           <th className="pb-3 font-medium">Status</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-border">
//                         {data.invoices.map((inv) => (
//                           <tr key={inv.id}>
//                             <td className="py-3 font-mono text-xs">{inv.invoiceNumber}</td>
//                             <td className="py-3 text-xs text-muted-foreground">
//                               {new Date(inv.createdAt).toLocaleDateString()}
//                             </td>
//                             <td className="py-3 text-right tabular-nums font-medium">
//                               {inv.currency} {inv.amount.toFixed(2)}
//                             </td>
//                             <td className="py-3">
//                               <span className={cn(
//                                 "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
//                                 inv.status === "SUCCEEDED" ? "bg-emerald-500/15 text-emerald-500"
//                                 : inv.status === "PENDING" ? "bg-amber-500/15 text-amber-500"
//                                 : "bg-destructive/15 text-destructive"
//                               )}>
//                                 {inv.status === "SUCCEEDED" ? <CheckCircle2 className="size-3" /> : inv.status === "FAILED" ? <XCircle className="size-3" /> : null}
//                                 {inv.status}
//                               </span>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </Panel>
//             </div>
//           </>
//         )}
//       </AppShell>
//     </ProtectedRoute>
//   );
// }