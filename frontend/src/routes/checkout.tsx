// frontend/src/routes/checkout.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/shop/public-header";
import { PaymentMethodPicker } from "@/components/payments/PaymentMethodPicker";
import { useCart } from "@/lib/cart";
import { paymentsApi, type PaymentProvider } from "@/lib/payments";
import { PageSkeleton } from "@/components/ui/skeletons";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — StyleAI" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useRole();

  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider | null>(null);
  const [allowedMethods, setAllowedMethods] = useState<PaymentProvider[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [address, setAddress] = useState({
    fullName: "", phone: "", street: "", city: "", state: "", postalCode: "", country: "PK", notes: "",
  });

  // Get currency from cart
  const displayCurrency = cart.items[0]?.currency || "PKR";

  useEffect(() => {
    let cancelled = false;
    setLoadingMethods(true);
    paymentsApi.getMethods("ORDER").then((res) => {
        if (cancelled) return;
        const providers = Array.isArray(res?.providers) ? res.providers : [];
        setAllowedMethods(providers);
        if (providers.length === 1) setPaymentMethod(providers[0]);
      }).catch((e: any) => {
        if (!cancelled) setError(e?.message || "Could not load payment methods");
      }).finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });
    return () => { cancelled = true; };
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
    for (const item of cart.items) cart.remove(item.slug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    const validationError = validate();
    if (validationError) return setError(validationError);
    if (cart.items.length === 0) return setError("Your cart is empty");

    setSubmitting(true);
    try {
      const cartItems = cart.items.map((i) => ({ productId: i.slug, quantity: i.qty }));

      const session = await paymentsApi.createOrderCheckout({
        cartItems,
        shippingAddress: address,
        provider: paymentMethod as PaymentProvider,
        currency: displayCurrency,
      } as any);

      const s: any = session || {};

      const redirectUrl = s.url || s.checkoutUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

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

  if (loadingMethods) return <div className="min-h-screen bg-background"><PublicHeader cartCount={cart.count} /><PageSkeleton /></div>;

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader cartCount={cart.count} />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent/10 text-accent"><ShoppingBag className="size-7" /></span>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">Your bag is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add pieces from the shop before checking out.</p>
          <Button asChild className="mt-6"><Link to="/shop">Browse the collection <ArrowRight className="ml-1 size-4" /></Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader cartCount={cart.count} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="size-4" /> Back to bag</Link>

        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Checkout</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Complete your order</h1>
          <p className="mt-2 text-sm text-muted-foreground">Confirm shipping and payment. All prices include applicable taxes.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <h2 className="font-display text-lg font-medium">Shipping address</h2>
                <p className="mt-1 text-xs text-muted-foreground mb-6">Where should we deliver your order?</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Full name</Label><Input required placeholder="Ayesha Khan" value={address.fullName} onChange={(e) => updateAddress("fullName", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input type="tel" required placeholder="+92 300 0000000" value={address.phone} onChange={(e) => updateAddress("phone", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2"><Label>Country</Label><Input required placeholder="PK" value={address.country} onChange={(e) => updateAddress("country", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Street address</Label><Input required placeholder="House 12, Street 5, Block A" value={address.street} onChange={(e) => updateAddress("street", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2"><Label>City</Label><Input required placeholder="Karachi" value={address.city} onChange={(e) => updateAddress("city", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2"><Label>State / Province (optional)</Label><Input placeholder="Sindh" value={address.state} onChange={(e) => updateAddress("state", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2"><Label>Postal code (optional)</Label><Input placeholder="75500" value={address.postalCode} onChange={(e) => updateAddress("postalCode", e.target.value)} disabled={submitting} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Delivery notes (optional)</Label><Input placeholder="Ring the bell twice, leave at door…" value={address.notes} onChange={(e) => updateAddress("notes", e.target.value)} disabled={submitting} /></div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <h2 className="font-display text-lg font-medium">Payment method</h2>
                <p className="mt-1 text-xs text-muted-foreground mb-6">How would you like to pay?</p>
                <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} allowed={allowedMethods} disabled={submitting} />
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 h-fit space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display text-lg font-medium mb-4">Order summary</h2>
                <ul className="space-y-4">
                  {cart.items.map((item) => (
                    <li key={item.slug} className="flex gap-3">
                      {item.image ? <img src={item.image} alt={item.name} className="size-16 rounded-lg object-cover border border-border" /> : <div className="size-16 rounded-lg bg-muted border border-border" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Qty {item.qty} · {item.category}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{item.currency || "PKR"} {(item.price * item.qty).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{displayCurrency} {cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="text-xs">Calculated at next step</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-base font-medium">
                    <span>Total</span>
                    <span className="font-display text-xl tabular-nums">{displayCurrency} {cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button type="submit" className="mt-6 w-full" size="lg" disabled={submitting || cart.items.length === 0}>
                  {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Processing…</> : paymentMethod === "COD" ? <><Truck className="mr-2 size-4" /> Place order (COD)</> : <><ShieldCheck className="mr-2 size-4" /> Continue to payment</>}
                </Button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">{paymentMethod === "COD" ? "Pay in cash when your order is delivered." : "You'll be redirected to complete payment securely."}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/50 p-4 text-xs text-muted-foreground flex items-center gap-2 justify-center">
                <ShieldCheck className="size-4 shrink-0 text-emerald-500" /><span>Your data is encrypted and secure.</span>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}