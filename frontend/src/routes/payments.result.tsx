// routes/payments.result.tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { PageHeader, Panel } from '@/components/ui-kit';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export const Route = createFileRoute('/payments/result')({
  head: () => ({ meta: [{ title: 'Payment Result — StyleAI' }] }),
  component: PaymentsResultPage,
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || 'pending',
    ref: (search.ref as string) || '',
    session_id: (search.session_id as string) || '',
  }),
});

function PaymentsResultPage() {
  const { status, ref, session_id } = Route.useSearch();
  const ok      = status === 'success' || status === 'SUCCEEDED';
  const failed  = status === 'failed'  || status === 'FAILED' || status === 'cancel';

  return (
    <ProtectedRoute roles={['BRAND_OWNER', 'AGENCY', 'SUPER_ADMIN', 'SHOPPER']}>
      <AppShell breadcrumb={['Payments', 'Result']}>
        <PageHeader
          eyebrow="Payments"
          title="Payment status"
          description="This page confirms the outcome of your transaction."
        />

        <div className="mt-8 max-w-xl">
          <Panel>
            <div className="flex flex-col items-center py-6 text-center">
              {ok ? (
                <CheckCircle2 className="size-14 text-emerald-500" />
              ) : failed ? (
                <XCircle className="size-14 text-destructive" />
              ) : (
                <Loader2 className="size-14 animate-spin text-accent" />
              )}

              <h2 className="mt-4 font-display text-2xl font-medium">
                {ok ? 'Payment successful' : failed ? 'Payment failed' : 'Processing payment'}
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                {ok
                  ? 'Your transaction has been confirmed. You can continue using the platform.'
                  : failed
                  ? 'The transaction was not completed. Please try again or choose a different method.'
                  : 'Please wait while we confirm your payment with the gateway.'}
              </p>

              {(ref || session_id) && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Reference: <span className="font-mono">{ref || session_id}</span>
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/billing">
                  <Button>
                    Back to billing <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline">Go to dashboard</Button>
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}