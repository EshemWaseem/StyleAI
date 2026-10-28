// routes/checkout.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import { useCart } from "@/lib/cart";
import { paymentsApi, type PaymentProvider } from "@/lib/payments";
import { PageSkeleton } from "@/components/ui/skeletons";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — StyleAI" },
      { name: "description", content: "Complete your StyleAI order." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider | null>(null);
  const [allowedMethods, setAllowedMethods] = useState<PaymentProvider[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
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

  // Load allowed payment methods for ORDER context
  useEffect(() => {
    let cancelled = false;
    setLoadingMethods(true);
    paymentsApi
      .getMethods("ORDER")
      .then((res) => {
        if (cancelled) return;
        // Response shape: { context: string; providers: PaymentProvider[] }
        const providers = Array.isArray(res?.providers) ? res.providers : [];
        setAllowedMethods(providers);
        if (providers.length === 1) setPaymentMethod(providers[0]);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || "Could not load payment methods");
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateAddress<K extends keyof typeof address>(key: K, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!address.fullName.trim()) return "Full name is required";
    if (!address.phone.trim()) return "Phone number is required";
    if (!address.street.trim()) return "Street address is required";
    if (!address.city.trim()) return "City is required";
    if (!paymentMethod) return "Please select a payment method";
    return null;
  }

  function clearCart() {
    for (const item of cart.items) {
      cart.remove(item.slug);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (cart.items.length === 0) {
      setError("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      const cartItems = cart.items.map((i) => ({
        productId: i.slug,
        quantity: i.qty,
      }));

      const session = await paymentsApi.createOrderCheckout({
        cartItems,
        shippingAddress: address,
        provider: paymentMethod as PaymentProvider,
        currency: "PKR",
      } as any);

      const s: any = session || {};

      // Stripe / redirect-based providers
      const redirectUrl = s.url || s.checkoutUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      // COD (or in-app success)
      const orderId = s.orderId || s.order?.id;
      clearCart();
      if (orderId) {
        navigate({ to: "/orders/$id", params: { id: orderId } });
      } else {
        navigate({ to: "/orders" });
      }
    } catch (errRaw: any) {
      setError(errRaw?.message || "Could not complete checkout. Please try again.");
      setSubmitting(false);
    }
  }

  if (loadingMethods) {
    return (
      <ProtectedRoute>
        <PageSkeleton />
      </ProtectedRoute>
    );
  }

  if (cart.items.length === 0) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent/10 text-accent">
            <ShoppingBag className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Your bag is empty
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add pieces from the shop before checking out.
          </p>
          <Button asChild className="mt-6">
            <Link to="/shop">
              Browse the collection <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="w-full max-w-full pb-12">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to bag
        </Link>

        <PageHeader
          eyebrow="Checkout"
          title="Complete your order"
          description="Confirm shipping and payment. All prices include applicable taxes."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Panel>
                <SectionTitle
                  title="Shipping address"
                  description="Where should we deliver your order?"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      required
                      autoComplete="name"
                      placeholder="Ayesha Khan"
                      value={address.fullName}
                      onChange={(e) => updateAddress("fullName", e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="+92 300 0000000"
                      value={address.phone}
                      onChange={(e) => updateAddress("phone", e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      required
                      autoComplete="country-name"
                      placeholder="PK"
                      value={address.country}
                      onChange={(e) => updateAddress("country", e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="street">Street address</Label>
                    <Input
                      id="street"
                      required
                      autoComplete="street-address"
                      placeholder="House 12, Street 5, Block A"
                      value={address.street}
                      onChange={(e) => updateAddress("street", e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      required
                      autoComplete="address-level2"
                      placeholder="Karachi"
                      value={address.city}
                      onChange={(e) => updateAddress("city", e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province (optional)</Label>
                    <Input
                      id="state"
                      autoComplete="address-level1"
                      placeholder="Sindh"
                      value={address.state}
                      onChange={(e) => updateAddress("state", e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal code (optional)</Label>
                    <Input
                      id="postalCode"
                      autoComplete="postal-code"
                      placeholder="75500"
                      value={address.postalCode}
                      onChange={(e) =>
                        updateAddress("postalCode", e.target.value)
                      }
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Delivery notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Ring the bell twice, leave at door…"
                      value={address.notes}
                      onChange={(e) => updateAddress("notes", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </Panel>

              <Panel>
                <SectionTitle
                  title="Payment method"
                  description="How would you like to pay?"
                />
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  allowed={allowedMethods}
                  disabled={submitting}
                />
              </Panel>
            </div>

            <aside className="lg:sticky lg:top-24 h-fit space-y-4">
              <Panel>
                <SectionTitle title="Order summary" />

                <ul className="space-y-3">
                  {cart.items.map((item) => (
                    <li key={item.slug} className="flex gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="size-14 rounded object-cover"
                        />
                      ) : (
                        <div className="size-14 rounded bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty {item.qty} · {item.category}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      ${cart.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-xs text-muted-foreground">
                      Calculated at next step
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-xl tabular-nums">
                      ${cart.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="mt-5 w-full"
                  size="lg"
                  disabled={submitting || cart.items.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Processing…
                    </>
                  ) : paymentMethod === "COD" ? (
                    <>
                      <Truck className="mr-1.5 size-4" />
                      Place order (COD)
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-1.5 size-4" />
                      Continue to payment
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {paymentMethod === "COD"
                    ? "Pay in cash when your order is delivered."
                    : "You'll be redirected to complete payment securely."}
                </p>
              </Panel>

              <div className="rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 shrink-0" />
                  <span>Your data is encrypted and secure.</span>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}