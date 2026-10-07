// routes/trial-expired.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui-kit';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { billingApi, type BillingMeResponse } from '@/lib/billing';

export const Route = createFileRoute('/trial-expired')({
  head: () => ({ meta: [{ title: 'Trial Expired — StyleAI' }] }),
  component: TrialExpiredPage,
});

function TrialExpiredPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<BillingMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingApi
      .getMe()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data) return;
    const state = data.subscription?.effectiveState;
    if (state === 'active' || state === 'trial') {
      navigate({ to: '/billing', replace: true });
    }
  }, [data, navigate]);

  // ---- Loading ----
  if (loading || !data) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[60vh] items-center justify-center px-4 sm:px-6">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground sm:size-5" />
            <span className="text-xs text-muted-foreground sm:text-sm">
              Checking your subscription…
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ---- Redirect (not expired) ----
  const state = data.subscription?.effectiveState;
  if (state !== 'trial_expired' && state !== 'expired' && state !== 'past_due') {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[60vh] items-center justify-center px-4 sm:px-6">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground sm:size-5" />
            <span className="text-xs text-muted-foreground sm:text-sm">
              Redirecting…
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ---- Expired ----
  return (
    <ProtectedRoute>
      {/* ---- Outer wrapper — always has breathing room ---- */}
      <div className="min-h-[calc(100vh-8rem)] w-full">
        {/* ---- Page header — responsive padding ---- */}
        <div className="px-4 pt-2 sm:px-6 sm:pt-4 lg:px-8">
          <PageHeader
            eyebrow="Action required"
            title="Your trial has ended"
            description="Choose a plan to keep using StyleAI's AI features and campaigns."
          />
        </div>

        {/* ---- Card — responsive container ---- */}
        <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <Panel className="w-full max-w-2xl overflow-hidden">
            <div className="flex flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-10 md:px-12 md:py-12">
              {/* ---- Icon ---- */}
              <div className="grid size-14 place-items-center rounded-full bg-amber-500/15 text-amber-500 sm:size-16 md:size-20">
                <Clock className="size-7 sm:size-8 md:size-10" />
              </div>

              {/* ---- Heading ---- */}
              <h2 className="mt-4 font-display text-xl font-medium sm:mt-5 sm:text-2xl md:text-3xl">
                Trial period ended
              </h2>

              {/* ---- Description ---- */}
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-[15px]">
                Your 3-day trial has expired. To continue using products, AI
                features, and campaigns, please choose a plan.
              </p>

              {/* ---- Trial end date ---- */}
              {data.subscription?.trialEndsAt && (
                <p className="mt-4 text-xs text-muted-foreground sm:mt-5 sm:text-[13px]">
                  Trial ended on{' '}
                  <span className="font-medium text-foreground/80">
                    {new Date(data.subscription.trialEndsAt).toLocaleString()}
                  </span>
                </p>
              )}

              {/* ---- Action buttons ---- */}
              <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="w-full justify-center sm:w-auto sm:min-w-[180px]"
                >
                  <Link to="/billing">
                    <Sparkles className="mr-1.5 size-4" />
                    Choose a plan
                    <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  size="lg"
                  className="w-full justify-center sm:w-auto sm:min-w-[180px]"
                >
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              </div>

              {/* ---- Info note ---- */}
              <div className="mt-6 flex w-full max-w-md items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5 text-left text-[11px] text-muted-foreground sm:mt-8 sm:px-4 sm:py-3 sm:text-xs">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 sm:size-4" />
                <span>
                  Your data is safe. Everything will be restored when you
                  upgrade.
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </ProtectedRoute>
  );
}