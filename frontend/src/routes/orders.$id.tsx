// routes/orders.$id.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ordersApi, type Order } from "@/lib/orders/api";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [
      { name: "robots", content: "noindex" },{ title: "Order — StyleAI" }] }),
  component: OrderDetailPage,
});

const STATUS_LABEL: Record<string, { label: string; tone: string; icon: any }> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "text-amber-500", icon: Clock },
  AWAITING_DELIVERY: { label: "Awaiting delivery", tone: "text-blue-500", icon: Truck },
  SHIPPED: { label: "Shipped", tone: "text-blue-500", icon: Truck },
  DELIVERED: { label: "Delivered", tone: "text-emerald-500", icon: CheckCircle2 },
  COMPLETED: { label: "Completed", tone: "text-emerald-500", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", tone: "text-destructive", icon: AlertCircle },
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .get(id)
      .then((r) => {
        if (!cancelled) setOrder(r.order);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Failed to load order");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="mt-16 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading order…</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error || "Order not found"}</span>
        </div>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" /> Back to home
            </Link>
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  const meta = STATUS_LABEL[order.status] || STATUS_LABEL.AWAITING_PAYMENT;
  const Icon = meta.icon;
  const pendingPayment = order.payments?.find((p) => p.status === "PENDING");

  return (
    <ProtectedRoute>
      <div className="ui-page-content">
        <PageHeader
          eyebrow="Order"
          title={`Order #${order.id.slice(0, 8).toUpperCase()}`}
          description={`Placed on ${new Date(order.createdAt).toLocaleString()}`}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="mr-1 size-4" /> Continue shopping
              </Link>
            </Button>
          }
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Panel>
              <div className={`flex items-center gap-3 ${meta.tone}`}>
                <Icon className="size-6" />
                <div>
                  <p className="text-base font-medium">{meta.label}</p>
                  {pendingPayment && (
                    <p className="text-xs text-muted-foreground">
                      Amount due on delivery: {pendingPayment.currency}{" "}
                      {Number(pendingPayment.amount).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="Items" />
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    {item.product?.primaryImage ? (
                      <img
                        src={item.product.primaryImage}
                        alt={item.name}
                        className="size-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <Package className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {order.currency} {(item.priceAtTime * item.quantity).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel>
              <SectionTitle title="Shipping to" />
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
                <p className="text-muted-foreground">{order.shippingAddress.street}</p>
                <p className="text-muted-foreground">
                  {[
                    order.shippingAddress.city,
                    order.shippingAddress.state,
                    order.shippingAddress.postalCode,
                    order.shippingAddress.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {order.shippingAddress.notes && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    Note: {order.shippingAddress.notes}
                  </p>
                )}
              </div>
            </Panel>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Panel>
              <SectionTitle title="Summary" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {order.currency} {order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at delivery</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {order.currency} {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {order.payments?.[0] && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  <p className="font-medium">Payment</p>
                  <p className="mt-1 text-muted-foreground">
                    {order.payments[0].provider} · {order.payments[0].status}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {order.payments[0].invoiceNumber}
                  </p>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}