// routes/plans.tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui-kit';
import { cn } from '@/lib/utils';
import { http } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Plan, BillingRole } from '@/lib/billing';

export const Route = createFileRoute('/plans')({
  head: () => ({ meta: [{ title: 'Plans & Pricing — StyleAI' }] }),
  component: PlansPage,
});

// Helper: user roles → billing role
function getUserBillingRole(roles: string[] | undefined): BillingRole | null {
  if (!roles?.length) return null;
  if (roles.includes('SUPER_ADMIN')) return null;
  if (roles.includes('AGENCY')) return 'AGENCY';
  if (roles.includes('BRAND_OWNER') || roles.includes('BRAND_TEAM_MEMBER')) return 'BRAND';
  if (roles.includes('INFLUENCER')) return 'INFLUENCER';
  return null;
}

function PlansPage() {
  const { user, loading: authLoading } = useRole();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const role = getUserBillingRole(user?.roles);

  useEffect(() => {
    if (authLoading) return;
    if (!role) {
      setLoading(false);
      return;
    }
    setLoading(true);
    http
      .get<{ plans: Plan[] }>(`/api/billing/plans?role=${role}`)
      .then((r) => setPlans(r.plans || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [authLoading, role]);

  // ---------- Admin ----------
  if (user?.roles?.includes('SUPER_ADMIN')) {
    return (
      <>
        <PageHeader
          eyebrow="Pricing"
          title="Plans & Pricing"
          description="Admin has full platform access."
        />
        <Panel className="mt-8">
          <p className="text-sm text-muted-foreground">
            As a SUPER_ADMIN, no subscription is required. Billing plans apply to brands, agencies, and influencers.
          </p>
        </Panel>
      </>
    );
  }

  // ---------- No role ----------
  if (!authLoading && !role) {
    return (
      <>
        <PageHeader
          eyebrow="Pricing"
          title="Plans & Pricing"
          description="Choose the plan that fits your business."
        />
        <Panel className="mt-8">
          <p className="text-sm text-muted-foreground">
            No billing role assigned to your account. Please contact support.
          </p>
        </Panel>
      </>
    );
  }

  // Role-specific title
  const titles: Record<BillingRole, { eyebrow: string; title: string; description: string }> = {
    BRAND: {
      eyebrow: 'For brands',
      title: 'Plans for your brand',
      description: 'Pick the plan that fits your stage. Upgrade or downgrade anytime.',
    },
    AGENCY: {
      eyebrow: 'For agencies',
      title: 'Plans for agencies',
      description: 'Manage multiple brands with lower take rates as you scale.',
    },
    INFLUENCER: {
      eyebrow: 'For creators',
      title: 'Plans for influencers',
      description: 'Get discovered, apply to campaigns, and grow your creator business.',
    },
  };

  const copy = role ? titles[role] : null;

  return (
    <>
      <PageHeader
        eyebrow={copy?.eyebrow || 'Pricing'}
        title={copy?.title || 'Plans & Pricing'}
        description={copy?.description || ''}
      />

      {loading ? (
        <Panel className="mt-8">
          <p className="py-8 text-center text-sm text-muted-foreground">Loading plans…</p>
        </Panel>
      ) : plans.length === 0 ? (
        <Panel className="mt-8">
          <p className="py-8 text-center text-sm text-muted-foreground">No plans available.</p>
        </Panel>
      ) : (
        <div
          className={cn(
            'mt-8 grid gap-4',
            plans.length === 3
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : plans.length === 4
              ? 'sm:grid-cols-2 lg:grid-cols-4'
              : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}
        >
          {plans.map((p) => (
            <article
              key={p.name}
              className={cn(
                'flex flex-col rounded-xl border bg-card p-6',
                p.popular ? 'border-accent ring-1 ring-accent' : 'border-border'
              )}
            >
              {p.popular && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase text-accent">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-medium">{p.label}</h3>
              {p.tagline && (
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
              )}
              <p className="mt-4 text-3xl font-display">
                {p.priceMonthly === null
                  ? 'Custom'
                  : p.priceMonthly === 0
                  ? (p.isTrial ? `${p.trialDays || 3}-day trial` : 'Free')
                  : `${p.currency} ${p.priceMonthly.toLocaleString()}`}
                {p.priceMonthly != null && p.priceMonthly > 0 && (
                  <span className="text-sm text-muted-foreground">/mo</span>
                )}
              </p>
              {p.takeRate != null && p.takeRate > 0 && (
                <p className="mt-1 text-[10px] text-accent">
                  Platform fee: {(p.takeRate * 100).toFixed(1)}%
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={p.popular ? 'default' : 'outline'}
                className="mt-6 w-full"
                disabled={p.isTrial}
              >
                <Link to="/billing">
                  <Sparkles className="mr-1.5 size-4" />
                  {p.isTrial
                    ? 'Trial used'
                    : p.priceMonthly === null
                    ? 'Contact sales'
                    : 'Go to billing'}
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        All prices exclude applicable taxes. Yearly plans save you 2 months.
      </p>
    </>
  );
}