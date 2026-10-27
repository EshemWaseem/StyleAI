// routes/orders.index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ordersApi, type Order, type OrderStatus } from "@/lib/orders/api";

export const Route = createFileRoute("/orders/")({
  head: () => ({ meta: [{ title: "My Orders — StyleAI" }] }),
  component: OrdersListPage,
});

const STATUS_META: Record<
  OrderStatus,
  { label: string; icon: any; tone: string }
> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", icon: Clock, tone: "text-amber-500" },
  AWAITING_DELIVERY: { label: "Awaiting delivery", icon: Truck, tone: "text-blue-500" },
  SHIPPED: { label: "Shipped", icon: Truck, tone: "text-blue-500" },
  DELIVERED: { label: "Delivered", icon: CheckCircle2, tone: "text-emerald-500" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, tone: "text-emerald-500" },
  CANCELLED: { label: "Cancelled", icon: AlertCircle, tone: "text-destructive" },
};

function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .list({ limit: 50 })
      .then((r) => {
        if (!cancelled) setOrders(r.orders || []);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute>
      <div className="ui-page-content">
        <PageHeader
          eyebrow="Account"
          title="My Orders"
          description="Track shipments and review your purchase history."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ShoppingBag className="mr-1.5 size-4" /> Continue shopping
              </Link>
            </Button>
          }
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <Panel className="mt-8">
            <div className="flex flex-col items-center py-12 text-center">
              <div className="grid size-14 place-items-center rounded-full bg-muted/30 text-muted-foreground">
                <Package className="size-6" />
              </div>
              <p className="mt-4 text-base font-medium">No orders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your orders will appear here once you place them.
              </p>
              <Button asChild className="mt-5">
                <Link to="/">
                  Start shopping <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </Panel>
        ) : (
          <div className="mt-8 space-y-3">
            <SectionTitle
              title={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
            />
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function OrderRow({ order }: { order: Order }) {
  const meta = STATUS_META[order.status] || STATUS_META.AWAITING_PAYMENT;
  const Icon = meta.icon;
  const firstImage = order.items[0]?.product?.primaryImage;
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Link
      to="/orders/$id"
      params={{ id: order.id }}
      className="block rounded-xl border border-border bg-card transition-colors hover:border-accent/40 hover:bg-accent/5"
    >
      <div className="flex flex-wrap items-center gap-4 p-4">
        {firstImage ? (
          <img
            src={firstImage}
            alt=""
            className="size-16 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Package className="size-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-medium">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <span className={`inline-flex items-center gap-1 text-xs ${meta.tone}`}>
              <Icon className="size-3" />
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString()} ·{" "}
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium tabular-nums">
            {order.currency} {order.totalAmount.toLocaleString()}
          </p>
          <ArrowRight className="ml-auto mt-1 size-3.5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}