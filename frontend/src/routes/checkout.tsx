// routes/checkout.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import { useCart } from "@/lib/cart";
import { paymentsApi } from "@/lib/payments";
import type { PaymentProvider } from "@/lib/payments";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — StyleAI" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider | null>(null);
  const [allowedMethods, setAllowedMethods] = useState<PaymentProvider[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "PK",
    notes: "",
  });

  useEffect(() => {
    paymentsApi
      .getMethods("ORDER")
      .then((r) => {
        const providers = r.providers || [];
        setAllowedMethods(providers);
        if (providers.length > 0) setPaymentMethod(providers[0]);
      })
      .catch(() => setAllowedMethods([]));
  }, []);

  useEffect(() => {
    if (cart.count === 0 && !submitting) {
      navigate({ to: "/" });
    }
  }, [cart.count, submitting, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    if (
      !address.fullName.trim() ||
      !address.phone.trim() ||
      !address.street.trim() ||
      !address.city.trim()
    ) {
      setError("Please fill name, phone, street, and city.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await paymentsApi.createOrderCheckout({
        provider: paymentMethod,
        cartItems: cart.items.map((item) => ({
          productId: item.slug,
          quantity: item.qty,
        })),
        shippingAddress: address,
        currency: "PKR",
      });

      cart.items.forEach((item) => cart.remove(item.slug));

      // Stripe-style providers return a URL to redirect to
      if (session.url) {
        window.location.href = session.url;
        return;
      }

      // COD-style providers return the created order
      const orderId =
        (session as any).orderId ??
        (session as any).order?.id ??
        (session as any).reference;

      if (orderId) {
        navigate({ to: `/orders/${orderId}` as any });
      } else {
        navigate({ to: "/" });
      }
    } catch (err: any) {
      setError(err?.message || "Checkout failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="ui-page-content">
        <PageHeader
          eyebrow="Checkout"
          title="Complete your order"
          description="Confirm shipping details and payment method."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="mr-1 size-4" /> Back to shop
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

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"
        >
          <div className="space-y-6">
            <Panel>
              <SectionTitle title="Shipping address" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Full name</Label>
                  <Input
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    placeholder="Ayesha Khan"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({ ...address, phone: e.target.value })
                    }
                    placeholder="+92 300 1234567"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={address.country}
                    onChange={(e) =>
                      setAddress({ ...address, country: e.target.value })
                    }
                    className="mt-1"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Street address</Label>
                  <Input
                    value={address.street}
                    onChange={(e) =>
                      setAddress({ ...address, street: e.target.value })
                    }
                    placeholder="House 12, Street 4, Phase 5"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={address.city}
                    onChange={(e) =>
                      setAddress({ ...address, city: e.target.value })
                    }
                    placeholder="Lahore"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>State / Province</Label>
                  <Input
                    value={address.state}
                    onChange={(e) =>
                      setAddress({ ...address, state: e.target.value })
                    }
                    placeholder="Punjab"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Postal code</Label>
                  <Input
                    value={address.postalCode}
                    onChange={(e) =>
                      setAddress({ ...address, postalCode: e.target.value })
                    }
                    placeholder="54000"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Delivery notes (optional)</Label>
                  <Input
                    value={address.notes}
                    onChange={(e) =>
                      setAddress({ ...address, notes: e.target.value })
                    }
                    placeholder="Ring the bell twice"
                    className="mt-1"
                  />
                </div>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="Payment method" />
              <div className="mt-2">
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  allowed={allowedMethods}
                  disabled={submitting}
                />
              </div>
            </Panel>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Panel>
              <SectionTitle title="Order summary" />
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li
                    key={item.slug}
                    className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
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
                      <p className="text-xs text-muted-foreground">
                        Qty {item.qty}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      PKR {(item.price * item.qty).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    PKR {cart.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated at delivery</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    PKR {cart.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={submitting || cart.count === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Placing
                    order…
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 size-4" /> Place order
                  </>
                )}
              </Button>

              <p className="mt-3 flex items-start gap-1.5 text-center text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3 shrink-0" />
                <span>Secure checkout. Your details are encrypted.</span>
              </p>
            </Panel>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}