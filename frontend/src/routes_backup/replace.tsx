// routes/plans.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import { http } from "@/lib/api";
import { useRole } from "@/lib/role";
import type { Plan, BillingRole } from "@/lib/billing";
import { formatPrice, usdEquivalent, formatTakeRate } from "@/lib/billing/format";

export const Route = createFileRoute("/replace")({
  head: () => ({ meta: [{ title: "Plans & Pricing — StyleAI" }] }),
  component: PlansPage,
});

function getUserBillingRole(roles: string[] | undefined): BillingRole | null {
  if (!roles?.length) return null;
  if (roles.includes("SUPER_ADMIN")) return null;
  if (roles.includes("AGENCY")) return "AGENCY";
  if (roles.includes("BRAND_OWNER") || roles.includes("BRAND_TEAM_MEMBER")) return "BRAND";
  if (roles.includes("INFLUENCER")) return "INFLUENCER";
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

  // ----- Admin view -----
  if (user?.roles?.includes("SUPER_ADMIN")) {
    return (
      <ProtectedRoute roles={["SUPER_ADMIN"]} skipTrialCheck>
        <AppShell breadcrumb={["Plans & Pricing"]}>
          <PageHeader
            eyebrow="Pricing"
            title="Plans & Pricing"
            description="Admin has full platform access."
          />
          <Panel className="mt-8">
            <p className="text-sm text-muted-foreground">
              As a SUPER_ADMIN, no subscription is required. Billing plans apply
              to brands, agencies, and influencers.
            </p>
          </Panel>
        </AppShell>
      </ProtectedRoute>
    );
  }

  // ----- No role -----
  if (!authLoading && !role) {
    return (
      <ProtectedRoute skipTrialCheck>
        <AppShell breadcrumb={["Plans & Pricing"]}>
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
        </AppShell>
      </ProtectedRoute>
    );
  }

  const titles: Record<
    BillingRole,
    { eyebrow: string; title: string; description: string }
  > = {
    BRAND: {
      eyebrow: "For brands",
      title: "Plans for your brand",
      description:
        "Pick the plan that fits your stage. Upgrade or downgrade anytime.",
    },
    AGENCY: {
      eyebrow: "For agencies",
      title: "Plans for agencies",
      description:
        "Manage multiple brands with lower take rates as you scale.",
    },
    INFLUENCER: {
      eyebrow: "For creators",
      title: "Plans for influencers",
      description:
        "Get discovered, apply to campaigns, and grow your creator business.",
    },
  };

  const copy = role ? titles[role] : null;

  return (
    <ProtectedRoute skipTrialCheck>
      <AppShell breadcrumb={["Plans & Pricing"]}>
        <PageHeader
          eyebrow={copy?.eyebrow || "Pricing"}
          title={copy?.title || "Plans & Pricing"}
          description={copy?.description || ""}
        />

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading plans…</span>
          </div>
        ) : plans.length === 0 ? (
          <Panel className="mt-8">
            <p className="py-8 text-center text-sm text-muted-foreground">
              No plans available.
            </p>
          </Panel>
        ) : (
          <div
            className={cn(
              "mt-8 grid gap-4",
              plans.length === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : plans.length === 4
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {plans.map((p) => {
              const usd = usdEquivalent(p.priceMonthly, p.currency);
              const take = formatTakeRate(p.takeRate);
              const isTrialPlan = p.isTrial;
              const isFree = p.isFree || (p.priceMonthly === 0 && !isTrialPlan);

              return (
                <article
                  key={p.name}
                  className={cn(
                    "flex flex-col rounded-xl border bg-card p-6",
                    p.popular ? "border-accent ring-1 ring-accent" : "border-border"
                  )}
                >
                  {p.popular && (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                      Most popular
                    </span>
                  )}

                  <h3 className="font-display text-2xl font-medium">{p.label}</h3>
                  {p.tagline && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                  )}

                  {/* Price */}
                  <div className="mt-5">
                    {isTrialPlan ? (
                      <p className="font-display text-3xl">
                        {p.trialDays || 3}-day free trial
                      </p>
                    ) : isFree ? (
                      <p className="font-display text-3xl">Free</p>
                    ) : (
                      <>
                        <p className="font-display text-3xl">
                          {formatPrice(p.priceMonthly, p.currency, { per: "mo" })}
                        </p>
                        {usd && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            ≈ {usd}/month
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Take rate */}
                  {take && (
                    <p className="mt-3 inline-flex w-fit rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Platform fee: {take}
                    </p>
                  )}

                  {/* Features */}
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    asChild
                    variant={p.popular ? "default" : "outline"}
                    className="mt-6 w-full"
                    disabled={isTrialPlan}
                  >
                    <Link to="/billing">
                      <Sparkles className="mr-1.5 size-4" />
                      {isTrialPlan
                        ? "Trial used"
                        : p.priceMonthly === null
                        ? "Contact sales"
                        : "Go to billing"}
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All prices exclude applicable taxes. Yearly plans save you 2 months.
          USD equivalent is approximate and based on current FX rates.
        </p>
      </AppShell>
    </ProtectedRoute>
  );
}