// routes/trial-expired.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
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

  // Silent redirect — valid trial or paid plan → /billing
  useEffect(() => {
    if (!data) return;
    const state = data.subscription?.effectiveState;
    if (state === 'active' || state === 'trial') {
      navigate({ to: '/billing', replace: true });
    }
  }, [data, navigate]);

  // Always show spinner until we know for sure (prevents flash)
  if (loading || !data) {
    return (
      <ProtectedRoute>
        <AppShell breadcrumb={['Trial Expired']}>
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Checking your subscription…</span>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  // If not expired → show generic "still active" and redirect after brief moment
  const state = data.subscription?.effectiveState;
  if (state !== 'trial_expired' && state !== 'expired' && state !== 'past_due') {
    return (
      <ProtectedRoute>
        <AppShell breadcrumb={['Trial Expired']}>
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Redirecting…</span>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  // ---- Actually expired ----
  return (
    <ProtectedRoute>
      <AppShell breadcrumb={['Trial Expired']}>
        <PageHeader
          eyebrow="Action required"
          title="Your trial has ended"
          description="Choose a plan to keep using StyleAI's AI features and campaigns."
        />

        <Panel className="mt-8">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-amber-500/15 text-amber-500">
              <Clock className="size-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-medium">
              Trial period ended
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Your 3-day trial has expired. To continue using products, AI features,
              and campaigns, please choose a plan.
            </p>

            {data.subscription?.trialEndsAt && (
              <p className="mt-4 text-xs text-muted-foreground">
                Trial ended on {new Date(data.subscription.trialEndsAt).toLocaleString()}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/billing">
                  <Sparkles className="mr-1.5 size-4" />
                  Choose a plan <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>Your data is safe. Everything will be restored when you upgrade.</span>
            </div>
          </div>
        </Panel>
      </AppShell>
    </ProtectedRoute>
  );
}