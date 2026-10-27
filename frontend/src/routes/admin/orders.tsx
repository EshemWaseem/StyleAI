// frontend/src/routes/admin/orders.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { adminOrdersApi, type AdminOrder, type OrderStatus } from "@/lib/admin/orders";
import { swalConfirm, swalError, swalSuccess } from "@/lib/swal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }] }),
  component: AdminOrdersPage,
});

const STATUS_META: Record<OrderStatus, { label: string; icon: any; tone: string }> = {
  PENDING: { label: "Pending", icon: Clock, tone: "bg-amber-500/15 text-amber-500" },
  CONFIRMED: { label: "Confirmed", icon: CheckCircle2, tone: "bg-blue-500/15 text-blue-500" },
  SHIPPED: { label: "Shipped", icon: Truck, tone: "bg-blue-500/15 text-blue-500" },
  DELIVERED: { label: "Delivered", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-500" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-500" },
  CANCELLED: { label: "Cancelled", icon: XCircle, tone: "bg-destructive/15 text-destructive" },
  REFUNDED: { label: "Refunded", icon: XCircle, tone: "bg-muted text-muted-foreground" },
};

function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminOrdersApi.list({
        status: statusFilter || undefined,
        provider: "COD",
      });
      setOrders(res.orders);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [statusFilter]);

  async function confirmDelivery(order: AdminOrder) {
    const ok = await swalConfirm(
      "Mark as delivered?",
      `Order #${order.id.slice(0, 8).toUpperCase()} — ${order.currency} ${order.totalAmount.toFixed(2)}\n\nThis will confirm the COD payment and notify the customer.`
    );
    if (!ok) return;

    setProcessing(order.id);
    try {
      await adminOrdersApi.confirmDelivery(order.id);
      swalSuccess("Order delivered", "Payment confirmed. Customer has been notified.");
      await load();
    } catch (e: any) {
      swalError("Failed", e?.message || "Could not confirm delivery");
    } finally {
      setProcessing(null);
    }
  }

  async function cancelOrder(order: AdminOrder) {
    const reason = window.prompt("Reason for cancellation? (optional)");
    if (reason === null) return;

    setProcessing(order.id);
    try {
      await adminOrdersApi.cancel(order.id, reason || undefined);
      swalSuccess("Order cancelled");
      await load();
    } catch (e: any) {
      swalError("Failed", e?.message || "Could not cancel");
    } finally {
      setProcessing(null);
    }
  }

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <div className="ui-page-content">
        <PageHeader
          eyebrow="Commerce"
          title="Customer orders"
          description="Confirm COD deliveries, track order status, and manage cancellations."
          actions={
            pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">
                <Clock className="size-3" />
                {pendingCount} pending delivery
              </span>
            ) : null
          }
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Button size="sm" variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <Panel className="mt-8">
            <div className="flex flex-col items-center py-12 text-center">
              <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No COD orders</p>
              <p className="mt-1 text-xs text-muted-foreground">
                COD orders will appear here once customers place them.
              </p>
            </div>
          </Panel>
        ) : (
          <div className="mt-6 space-y-3">
            <SectionTitle title={`${orders.length} order${orders.length === 1 ? "" : "s"}`} />
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                processing={processing === order.id}
                onConfirm={() => confirmDelivery(order)}
                onCancel={() => cancelOrder(order)}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function OrderCard({
  order,
  processing,
  onConfirm,
  onCancel,
}: {
  order: AdminOrder;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const meta = STATUS_META[order.status];
  const Icon = meta.icon;
  const codPayment = order.payments.find((p) => p.provider === "COD" && p.context === "ORDER");
  const canConfirm = ["PENDING", "CONFIRMED", "SHIPPED"].includes(order.status) && codPayment?.status === "PENDING";
  const canCancel = !["DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className={cn("grid size-10 place-items-center rounded-lg", meta.tone)}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="font-display text-base font-medium">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.user?.name || "Unknown"} · {order.user?.email || "—"} ·{" "}
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase", meta.tone)}>
            {meta.label}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {order.currency} {order.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Items ({order.items.length})
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {order.currency} {(item.priceAtTime * item.quantity).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          {codPayment && (
            <p className="mt-3 text-xs text-muted-foreground">
              COD · {codPayment.invoiceNumber} · Payment{" "}
              <span className={codPayment.status === "SUCCEEDED" ? "text-emerald-500" : "text-amber-500"}>
                {codPayment.status}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
          {canConfirm && (
            <Button size="sm" onClick={onConfirm} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Confirming…
                </>
              ) : (
                <>
                  <Package className="mr-1.5 size-3.5" /> Confirm delivered
                </>
              )}
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={onCancel} disabled={processing}>
              Cancel order
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}