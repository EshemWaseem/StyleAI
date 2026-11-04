import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Package, Truck, CheckCircle2, ChevronRight, ArrowLeft,
  Loader2, ShoppingBag, RefreshCw, Clock, User, LogOut, PackageCheck, MapPin, Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role";
import { http } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "My Orders — StyleAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const TRACKING_STEPS = [
  { id: "PENDING", label: "Placed", icon: Clock },
  { id: "PROCESSING", label: "Processing", icon: Package },
  { id: "SHIPPED", label: "Shipped", icon: Truck },
  { id: "DELIVERED", label: "Delivered", icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  const idx = TRACKING_STEPS.findIndex(s => s.id === status?.toUpperCase());
  return idx === -1 ? 0 : idx;
}

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="size-full grid place-items-center bg-muted text-muted-foreground">
        <ShoppingBag className="size-5 opacity-30" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function OrdersPage() {
  const { user, logout } = useRole();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await http.get<{ orders: any[] }>("/api/orders");
      const sorted = (res.orders || []).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sorted);
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      setError(err?.message || "Could not load your orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Link to="/login" className="text-accent underline">Please sign in to view your orders.</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display">S</span>
            <span className="font-display text-lg font-medium">StyleAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/shop" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block">
              Shop
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="size-4" />
                  <span className="max-w-[100px] truncate">
                    {user.name ? user.name.split(" ")[0] : "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/orders" className="cursor-pointer">
                    <PackageCheck className="mr-2 size-4" /> My Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account" className="cursor-pointer">
                    <User className="mr-2 size-4" /> Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="mr-2 size-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="font-display text-3xl font-medium tracking-tight">My Orders</h1>
              <p className="mt-1 text-sm text-muted-foreground">Track your recent purchases.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            {refreshing ? "Checking..." : "Track Updates"}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Loading orders...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-lg font-medium">No orders yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
            <Button asChild className="mt-6">
              <Link to="/shop">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order: any) => {
              const currentStep = getStepIndex(order.status);
              const orderTotal = Number(order.totalAmount || 0);
              const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

              return (
                <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/20 p-4 sm:px-6">
                    <div className="grid grid-cols-2 gap-4 sm:flex sm:gap-12">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order Placed</p>
                        <p className="text-sm font-medium">
                          {orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                        <p className="text-sm font-medium">${orderTotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Order ID</p>
                        <p className="text-sm font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-border p-6 bg-accent/5">
                    <div className="relative flex justify-between">
                      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-border rounded-full" />
                      <div
                        className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%` }}
                      />
                      {TRACKING_STEPS.map((step, idx) => {
                        const isCompleted = idx <= currentStep;
                        const isActive = idx === currentStep;
                        const Icon = step.icon;
                        return (
                          <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={cn(
                              "grid size-8 place-items-center rounded-full border-2 transition-colors",
                              isCompleted ? "bg-accent border-accent text-background" : "bg-card border-border text-muted-foreground"
                            )}>
                              <Icon className="size-4" />
                            </div>
                            <span className={cn(
                              "text-[10px] sm:text-xs font-medium",
                              isActive ? "text-accent" : isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {order.items?.slice(0, 2).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 sm:px-6">
                        <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                          <ProductImage
                            src={item.product?.primaryImage}
                            alt={item.name || item.product?.name || "Product"}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.name || item.product?.name || "Product"}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</p>
                        </div>
                        <p className="text-sm font-medium tabular-nums">
                          ${Number(item.priceAtTime || item.price || 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                    {order.items?.length > 2 && (
                      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/10">
                        + {order.items.length - 2} more item(s)
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-border p-4 bg-muted/10">
                    <p className="text-xs text-muted-foreground">
                      Status: <strong className="text-foreground">{order.status}</strong>
                    </p>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedOrder(order)}>
                      View Details <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (() => {
            const modalTotal =
              Number(selectedOrder.totalAmount) > 0
                ? Number(selectedOrder.totalAmount)
                : (selectedOrder.items ?? []).reduce(
                    (sum: number, i: any) =>
                      sum + Number(i.priceAtTime || i.price || 0) * (i.quantity || 1),
                    0
                  );

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">
                    Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </DialogTitle>
                  <DialogDescription>
                    Placed on {new Date(selectedOrder.createdAt).toLocaleDateString("en-US", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-3 mt-4">
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Items</h3>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {selectedOrder.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 p-4">
                          <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            <ProductImage
                              src={item.product?.primaryImage}
                              alt={item.name || item.product?.name || "Product"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{item.name || item.product?.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium tabular-nums text-sm">
                            ${Number(item.priceAtTime || item.price || 0).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-lg border border-border p-4">
                      <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <MapPin className="size-4" /> Shipping
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">
                          {selectedOrder.shippingAddress?.fullName || user.name}
                        </p>
                        {selectedOrder.shippingAddress?.phone && (
                          <p>{selectedOrder.shippingAddress.phone}</p>
                        )}
                        <p>{selectedOrder.shippingAddress?.street || "Address provided at checkout"}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4 bg-muted/10">
                      <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <Receipt className="size-4" /> Summary
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Total Amount</span>
                          <span className="font-medium text-foreground">${modalTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Status</span>
                          <span className="font-medium text-foreground">{selectedOrder.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}