// routes/payments.result.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Package,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { paymentsApi } from "@/lib/payments";

export const Route = createFileRoute("/payments/result")({
  head: () => ({ meta: [{ title: "Payment Result — StyleAI" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || "",
    session_id: (search.session_id as string) || "",
  }),
  component: PaymentResultPage,
});

type VerificationState = "loading" | "success" | "cancelled" | "error";

function PaymentResultPage() {
  const { status, session_id } = Route.useSearch();
  const [state, setState] = useState<VerificationState>("loading");
  const [order, setOrder] = useState<any | null>(null);
  const [isSubscription, setIsSubscription] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status === "cancel") {
      setState("cancelled");
      return;
    }

    if (!session_id) {
      setState("error");
      setErrorMsg(
        "No payment reference found. If you were charged, please contact support."
      );
      return;
    }

    let cancelled = false;
    paymentsApi
      .verifyOrderSession(session_id)
      .then((res) => {
        if (cancelled) return;
        setOrder(res.order);
        setIsSubscription(!res.order);
        setState("success");
      })
      .catch((e: any) => {
        if (cancelled) return;
        setState("error");
        setErrorMsg(e?.message || "Could not verify payment.");
      });

    return () => {
      cancelled = true;
    };
  }, [session_id, status]);

  return (
    <ProtectedRoute>
      <div className="ui-page-content">
        <PageHeader
          eyebrow="Payment"
          title="Payment status"
          description="We're confirming the outcome of your transaction."
        />

        <div className="ui-panel-md mx-auto mt-8">
          <Panel>
            <div className="flex flex-col items-center py-10 text-center px-6">
              {state === "loading" && (
                <>
                  <Loader2 className="size-12 animate-spin text-accent" />
                  <h2 className="mt-4 font-display text-2xl font-medium">
                    Verifying payment…
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please don't close this window. This usually takes
                    5–10 seconds.
                  </p>
                </>
              )}

              {state === "success" && (
                <>
                  <CheckCircle2 className="size-12 text-emerald-500" />
                  <h2 className="mt-4 font-display text-2xl font-medium">
                    Payment successful
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isSubscription
                      ? "Your plan has been upgraded."
                      : "Your order is confirmed. We'll ship it shortly."}
                  </p>

                  {order && (
                    <div className="mt-6 w-full rounded-lg border border-border bg-muted/20 p-4 text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Order
                      </p>
                      <p className="mt-1 font-display text-base font-medium">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {order.currency}{" "}
                        {Number(order.totalAmount).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {order ? (
                      <Button asChild>
                        <Link to="/orders/$id" params={{ id: order.id }}>
                          <Package className="mr-1.5 size-4" />
                          View order
                          <ArrowRight className="ml-1.5 size-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link to="/billing">
                          View billing
                          <ArrowRight className="ml-1.5 size-4" />
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline">
                      <Link to="/">Continue shopping</Link>
                    </Button>
                  </div>
                </>
              )}

              {state === "cancelled" && (
                <>
                  <XCircle className="size-12 text-muted-foreground" />
                  <h2 className="mt-4 font-display text-2xl font-medium">
                    Payment cancelled
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No charge was made. Your order is still saved — you can
                    retry checkout anytime.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button asChild>
                      <Link to="/checkout">Try again</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/">Back to shop</Link>
                    </Button>
                  </div>
                </>
              )}

              {state === "error" && (
                <>
                  <XCircle className="size-12 text-destructive" />
                  <h2 className="mt-4 font-display text-2xl font-medium">
                    Could not confirm payment
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {errorMsg}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button asChild>
                      <Link to="/checkout">Try again</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/">Back to shop</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </ProtectedRoute>
  );
}