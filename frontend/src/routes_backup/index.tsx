import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import {
  publicProductsApi,
  type PublicProduct,
  type PublicBrand,
} from "@/lib/products";
import { ProductImageSlider } from "@/components/ProductImageSlider";
import hero from "@/assets/hero-editorial.jpg";
import maya from "@/assets/c-maya.jpg";
import zara from "@/assets/c-zara.jpg";
import sofia from "@/assets/c-sofia.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StyleAI — Shop the AI-styled fashion atelier" },
      {
        name: "description",
        content:
          "Shop the StyleAI collection — dresses, outerwear, bags and footwear styled by AI, matched with creators, and delivered worldwide.",
      },
    ],
  }),
  component: Storefront,
});

const categories = [
  "All",
  "Clothing",
  "Footwear",
  "Accessories",
  "Bags",
  "Outerwear",
];

const loop = ["Product", "Understand", "Match", "Create", "Launch", "Measure"];

function Storefront() {
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [activeBrand, setActiveBrand] = useState<string>("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const cart = useCart();

  useEffect(() => {
    publicProductsApi
      .brands()
      .then((res) => setBrands(res.brands))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    publicProductsApi
      .list({
        brand: activeBrand || undefined,
        category: filter !== "All" ? filter : undefined,
        search: query.trim() || undefined,
      })
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeBrand, filter, query]);

  function addToCart(p: PublicProduct) {
    cart.add({
      slug: p.id,
      name: p.name,
      price: p.price ?? 0,
      image: p.primaryImage ?? "",
      category: p.category ?? "",
    });
    setJustAdded(p.id);
    window.setTimeout(() => setJustAdded((s) => (s === p.id ? null : s)), 1400);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
              <span className="font-display text-sm leading-none">S</span>
            </span>
            <span className="font-display text-[15px] font-medium tracking-tight">
              StyleAI
            </span>
          </Link>

          <nav
            className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground lg:flex"
            aria-label="Shop"
          >
            <a href="#shop" className="hover:text-foreground">
              Shop
            </a>
            <a href="#edit" className="hover:text-foreground">
              Editorial
            </a>
            <a href="#creators" className="hover:text-foreground">
              Creators
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/login">Login</Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/register" search={{ role: "SHOPPER" }}>
                Just shopping?
              </Link>
            </Button>

            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="relative grid size-9 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-accent/10"
                  aria-label={`Open cart, ${cart.count} items`}
                >
                  <ShoppingBag className="size-4" aria-hidden="true" />
                  {cart.count > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-background">
                      {cart.count}
                    </span>
                  ) : null}
                </button>
              </SheetTrigger>
              <SheetContent className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="font-display text-xl font-medium">
                    Your bag
                  </SheetTitle>
                </SheetHeader>

                {cart.items.length === 0 ? (
                  <p className="mt-8 px-4 text-sm text-muted-foreground">
                    Your bag is empty. Add a piece from the collection to begin.
                  </p>
                ) : (
                  <ul className="mt-4 flex-1 space-y-4 overflow-y-auto px-4">
                    {cart.items.map((item) => (
                      <li
                        key={item.slug}
                        className="flex gap-3 border-b border-border pb-4"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            className="size-20 rounded-md object-cover"
                          />
                        ) : (
                          <div className="size-20 rounded-md bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.category}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() =>
                                cart.setQty(item.slug, item.qty - 1)
                              }
                              aria-label={`Decrease ${item.name}`}
                              className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent/10"
                            >
                              <Minus className="size-3" aria-hidden="true" />
                            </button>
                            <span className="w-6 text-center text-sm tabular-nums">
                              {item.qty}
                            </span>
                            <button
                              onClick={() =>
                                cart.setQty(item.slug, item.qty + 1)
                              }
                              aria-label={`Increase ${item.name}`}
                              className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent/10"
                            >
                              <Plus className="size-3" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => cart.remove(item.slug)}
                              aria-label={`Remove ${item.name}`}
                              className="ml-auto text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          ${item.price * item.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto space-y-3 border-t border-border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display text-xl tabular-nums">
                      ${cart.total}
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={cart.items.length === 0}
                  >
                    Checkout <ArrowRight />
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Shipping and taxes calculated at checkout.
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Autumn Atelier · AW26
            </p>
            <h1 className="mt-5 max-w-xl font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              The collection, styled by intelligence.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              Every piece is read, understood and matched by StyleAI.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#shop">
                  Shop the collection <ArrowRight />
                </a>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                ["Free", "Shipping over $200"],
                ["30 days", "Easy returns"],
                ["96", "Avg. AI style match"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-medium tabular-nums">
                    {v}
                  </dt>
                  <dd className="mt-1 text-xs leading-5 text-muted-foreground">
                    {l}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lift">
            <img
              src={hero}
              alt="Editorial campaign"
              width={1408}
              height={1008}
              className="aspect-[7/5] w-full object-cover"
            />
          </div>
        </section>

        {/* SHOP */}
        <section id="shop" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-medium tracking-tight">
                  Shop the collection
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : `${products.length} pieces available now.`}
                </p>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-72">
                <Search
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  aria-label="Search the collection"
                  placeholder="Search pieces…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* BRAND FILTER */}
            {brands.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Brands
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveBrand("")}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      activeBrand === ""
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All brands
                  </button>
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setActiveBrand(b.slug)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm transition-colors",
                        activeBrand === b.slug
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {b.name}
                      <span className="ml-1.5 text-xs opacity-60">
                        {b.productCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CATEGORY FILTER */}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    filter === c
                      ? "border-accent bg-accent text-background"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="mt-12 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                Loading products…
              </p>
            ) : products.length === 0 ? (
              <p className="mt-12 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {query || activeBrand || filter !== "All"
                  ? "No pieces match these filters."
                  : "No products available yet. Check back soon."}
              </p>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((p) => {
                  const added = justAdded === p.id;
                  return (
                    <article
                      key={p.id}
                      className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift"
                    >
                      <div className="relative">
                        {/* MINI SLIDER on card */}
                        <ProductImageSlider
                              images={p.images ?? []}
                              alt={p.name}
                              aspect="aspect-[3/4]"
                              size="sm"
                              showDots={false}
                              showCounter={(p.images ?? []).length > 1}
                              rounded="rounded-none"
                            />
                        <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-accent">
                          <Sparkles className="size-3" aria-hidden="true" />{" "}
                          {p.brand.name}
                        </span>
                      </div>

                      <div className="space-y-3 p-5">
                        <div>
                          <h3 className="font-display text-lg font-medium leading-snug">
                            {p.name}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {p.category}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium tabular-nums">
                            {p.currency} {p.price?.toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant={added ? "secondary" : "default"}
                            onClick={() => addToCart(p)}
                            aria-label={`Add ${p.name} to cart`}
                          >
                            {added ? (
                              <>
                                <Check /> Added
                              </>
                            ) : (
                              <>
                                <Plus /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* EDITORIAL */}
        <section id="edit" className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="max-w-lg font-display text-3xl font-medium tracking-tight">
              Behind every piece: the StyleAI loop.
            </h2>
            <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-4">
              {loop.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="rounded-full border border-border bg-card px-4 py-2 text-sm">
                    {step}
                  </span>
                  {i < loop.length - 1 && (
                    <ArrowRight
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CREATORS */}
        <section
          id="creators"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        >
          <h2 className="font-display text-3xl font-medium tracking-tight">
            Styled by our creators
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              {
                img: maya,
                name: "Maya Khan",
                note: "Wears the Noir Evening Dress",
              },
              {
                img: zara,
                name: "Zara Lin",
                note: "Wears the Maison Oversized Coat",
              },
              {
                img: sofia,
                name: "Sofia Reyes",
                note: "Wears the Luna Leather Handbag",
              },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
              >
                <img
                  src={c.img}
                  alt={c.name}
                  loading="lazy"
                  className="size-14 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6">
          <span>© 2026 StyleAI</span>
          <span>
            AI style matches are estimates — always trust your own eye.
          </span>
        </div>
      </footer>
    </div>
  );
}