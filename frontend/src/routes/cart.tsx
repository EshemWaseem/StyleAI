// frontend/src/routes/cart.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/shop/public-header";
import { useCart } from "@/lib/cart";
import { SEO } from "@/lib/seo";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — StyleAI" },
      { name: "description", content: "Review your StyleAI bag before checkout." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: SEO.siteUrl + "/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { user } = useRole();
  const navigate = useNavigate();

  function handleCheckout() {
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/checkout" } as any });
      return;
    }
    navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader cartCount={cart.count} />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Bag
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Your bag
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {cart.count === 0
              ? "Your bag is empty."
              : `${cart.count} item${cart.count === 1 ? "" : "s"} ready to checkout.`}
          </p>
        </div>

        {cart.items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center sm:p-16">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent/10 text-accent">
              <ShoppingBag className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-xl font-medium">
              Nothing here yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Explore the collection and add pieces you love.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop">
                Start shopping <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Items list */}
            <div>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {cart.items.map((item) => (
                  <li key={item.slug} className="flex gap-4 p-4 sm:p-5">
                    {item.image ? (
                      <Link
                        to="/shop/product/$slug"
                        params={{ slug: item.slug }}
                        className="shrink-0"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="size-20 rounded-md object-cover sm:size-24"
                        />
                      </Link>
                    ) : (
                      <div className="size-20 shrink-0 rounded-md bg-muted sm:size-24" />
                    )}

                    <div className="min-w-0 flex-1">
                      <Link
                        to="/shop/product/$slug"
                        params={{ slug: item.slug }}
                        className="block"
                      >
                        <h3 className="truncate font-display text-base font-medium hover:underline sm:text-lg">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.category}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 rounded-md border border-border bg-background">
                          <button
                            onClick={() =>
                              cart.setQty(item.slug, Math.max(1, item.qty - 1))
                            }
                            className="grid size-8 place-items-center hover:bg-accent/10 disabled:opacity-50"
                            disabled={item.qty <= 1}
                            aria-label={`Decrease ${item.name}`}
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            onClick={() =>
                              cart.setQty(item.slug, item.qty + 1)
                            }
                            className="grid size-8 place-items-center hover:bg-accent/10"
                            aria-label={`Increase ${item.name}`}
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium tabular-nums">
                            ${(item.price * item.qty).toFixed(2)}
                          </span>
                          <button
                            onClick={() => cart.remove(item.slug)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order summary */}
            <aside className="lg:sticky lg:top-24 h-fit rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-lg font-medium">Order summary</h2>

              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Subtotal ({cart.count} item{cart.count === 1 ? "" : "s"})
                  </dt>
                  <dd className="font-medium tabular-nums">
                    ${cart.total.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="text-xs text-muted-foreground">
                    Calculated at checkout
                  </dd>
                </div>
                <div className="border-t border-border pt-2.5">
                  <div className="flex items-center justify-between text-base">
                    <dt className="font-medium">Total</dt>
                    <dd className="font-display text-xl tabular-nums">
                      ${cart.total.toFixed(2)}
                    </dd>
                  </div>
                </div>
              </dl>

              <Button onClick={handleCheckout} className="mt-5 w-full" size="lg">
                Checkout <ArrowRight className="ml-1 size-4" />
              </Button>

              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                {!user
                  ? "You'll be asked to sign in to complete checkout."
                  : "Shipping and taxes calculated at checkout."}
              </p>

              <div className="mt-4 border-t border-border pt-4">
                <Link
                  to="/shop"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Continue shopping →
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}