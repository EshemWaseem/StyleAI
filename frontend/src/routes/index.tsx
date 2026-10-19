import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Package,
  Palette,
  Store,
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
  publicStorefrontApi,
  type PublicProduct,
  type PublicBrand,
  type StorefrontHeroSlide,
  type StorefrontSectionPublic,
  type StorefrontEditorial,
  type StorefrontCreator,
} from "@/lib/products";
import { ProductImageSlider } from "@/components/ProductImageSlider";

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

// ======================================================
// SCROLL-SPY
// ======================================================
const SECTIONS = [
  { id: "shop", label: "Shop" },
  { id: "edit", label: "Editorial" },
  { id: "creators", label: "Creators" },
] as const;

const NAV_OFFSET = 80;

function useSmoothScrollTo(offset = NAV_OFFSET) {
  return useCallback(
    (id: string | null, onDone?: () => void) => {
      if (typeof window === "undefined") return;

      if (!id || id === "top" || id === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (history.replaceState) {
          history.replaceState(null, "", window.location.pathname);
        }
        onDone?.();
        return;
      }

      const el = document.getElementById(id);
      if (!el) {
        onDone?.();
        return;
      }

      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });

      if (history.replaceState) {
        history.replaceState(null, "", `#${id}`);
      }

      window.setTimeout(() => onDone?.(), 350);
    },
    [offset]
  );
}

function useScrollSpy(ids: readonly string[], offset = NAV_OFFSET) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || ids.length === 0) return;

    let rafId: number | null = null;

    const update = () => {
      rafId = null;

      if (window.scrollY < 80) {
        setActiveId("");
        return;
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 40;

      if (atBottom) {
        setActiveId(ids[ids.length - 1]);
        return;
      }

      const probeY = window.scrollY + offset + 60;
      let current = "";

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= probeY) current = id;
        else break;
      }

      setActiveId(current);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids.join(","), offset]);

  return activeId;
}

// ======================================================
// STOREFRONT
// ======================================================
function Storefront() {
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [activeBrand, setActiveBrand] = useState<string>("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [heroSlides, setHeroSlides] = useState<StorefrontHeroSlide[]>([]);
  const [sections, setSections] = useState<StorefrontSectionPublic[]>([]);
  const [editorial, setEditorial] = useState<StorefrontEditorial | null>(null);
  const [creators, setCreators] = useState<StorefrontCreator[]>([]);

  const cart = useCart();

  const scrollTo = useSmoothScrollTo(NAV_OFFSET);
  const activeSection = useScrollSpy(
    SECTIONS.map((s) => s.id),
    NAV_OFFSET
  );

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

  useEffect(() => {
    publicStorefrontApi
      .get()
      .then((r) => {
        setHeroSlides(r.hero || []);
        setSections(r.sections || []);
        setEditorial(r.editorial || null);
        setCreators(r.creators || []);
      })
      .catch(() => {
        setHeroSlides([]);
        setSections([]);
        setEditorial(null);
        setCreators([]);
      });
  }, []);

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

  function handleMobileNavClick(id: string) {
    scrollTo(id, () => setMobileNavOpen(false));
  }

  const showEditorial = !!editorial && editorial.steps.length > 0;
  const showCreators = creators.length > 0;

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === "edit") return showEditorial;
    if (s.id === "creators") return showCreators;
    return true;
  });

  const hasHeroSlides = heroSlides.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => scrollTo(null)}
            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
            aria-label="StyleAI — back to top"
          >
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
              <span className="font-display text-sm leading-none">S</span>
            </span>
            <span className="font-display text-[15px] font-medium tracking-tight">
              StyleAI
            </span>
          </button>

          <nav
            className="ml-6 hidden items-center gap-6 text-sm lg:flex"
            aria-label="Shop"
          >
            {visibleSections.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative py-1 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -bottom-0.5 left-0 right-0 h-px bg-foreground transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
            >
              <Link to="/login">Login</Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
            >
              <Link to="/register" search={{ role: "SHOPPER" }}>
                Just shopping?
              </Link>
            </Button>

            <Button asChild className="hidden sm:inline-flex">
              <Link to="/register">Register</Link>
            </Button>

            {/* CART */}
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

            {/* MOBILE MENU */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  className="grid size-9 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-accent/10 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex w-[280px] flex-col sm:max-w-xs"
              >
                <SheetHeader>
                  <SheetTitle className="font-display text-lg font-medium">
                    Menu
                  </SheetTitle>
                </SheetHeader>

                <nav className="mt-6 flex flex-col gap-1">
                  {visibleSections.map((s) => {
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleMobileNavClick(s.id)}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-accent/10 text-foreground"
                            : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                        )}
                      >
                        <span>{s.label}</span>
                        {isActive && (
                          <span className="size-1.5 rounded-full bg-foreground" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-auto space-y-2 border-t border-border pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-center"
                  >
                    <Link to="/login" onClick={() => setMobileNavOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-center"
                  >
                    <Link
                      to="/register"
                      search={{ role: "SHOPPER" }}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      Just shopping?
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-center">
                    <Link
                      to="/register"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      Register
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        {/* HERO — admin slides OR branding hero */}
        {hasHeroSlides ? (
          <HeroCarousel
            slides={heroSlides}
            onScrollToShop={() => scrollTo("shop")}
          />
        ) : (
          <BrandingHero onScrollToShop={() => scrollTo("shop")} />
        )}

        {/* SHOP */}
        <section id="shop" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  Shop the collection
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : products.length === 0
                    ? "Pieces from approved brands"
                    : `${products.length} piece${products.length === 1 ? "" : "s"} available now.`}
                </p>
              </div>
              {products.length > 0 && (
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
              )}
            </div>

            {brands.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Brands
                </p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  <ChipButton
                    active={activeBrand === ""}
                    onClick={() => setActiveBrand("")}
                  >
                    All brands
                  </ChipButton>
                  {brands.map((b) => (
                    <ChipButton
                      key={b.id}
                      active={activeBrand === b.slug}
                      onClick={() => setActiveBrand(b.slug)}
                    >
                      {b.name}
                      <span className="ml-1.5 text-xs opacity-60">
                        {b.productCount}
                      </span>
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {categories.map((c) => (
                  <ChipButton
                    key={c}
                    accent
                    active={filter === c}
                    onClick={() => setFilter(c)}
                  >
                    {c}
                  </ChipButton>
                ))}
              </div>
            )}

            {loading ? (
              <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground sm:mt-12 sm:p-12">
                Loading products…
              </p>
            ) : products.length === 0 ? (
              <ComingSoon />
            ) : (
              <ProductGrid
                products={products}
                justAdded={justAdded}
                onAdd={addToCart}
              />
            )}
          </div>
        </section>

        {/* ADMIN-CONTROLLED SECTIONS */}
        {sections.map((sec) => (
          <section
            key={sec.id}
            className="scroll-mt-20 border-t border-border bg-card/30"
          >
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                    {sec.title}
                  </h2>
                  {sec.subtitle && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {sec.subtitle}
                    </p>
                  )}
                </div>
                {products.length > 0 && (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/products">View all</Link>
                  </Button>
                )}
              </div>
              {sec.layout === "CAROUSEL" ? (
                <ProductCarousel
                  products={sec.products}
                  justAdded={justAdded}
                  onAdd={addToCart}
                />
              ) : (
                <ProductGrid
                  products={sec.products}
                  justAdded={justAdded}
                  onAdd={addToCart}
                />
              )}
            </div>
          </section>
        ))}

        {/* EDITORIAL */}
        {showEditorial && editorial && (
          <section
            id="edit"
            className="scroll-mt-20 border-t border-border bg-card/50"
          >
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <h2 className="max-w-lg font-display text-2xl font-medium tracking-tight sm:text-3xl">
                {editorial.title}
              </h2>
              <ol className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 sm:mt-8 sm:gap-y-4">
                {editorial.steps.map((step, i) => (
                  <li key={`${step}-${i}`} className="flex items-center gap-3">
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                      {step}
                    </span>
                    {i < editorial.steps.length - 1 && (
                      <ArrowRight
                        className="size-3.5 text-muted-foreground sm:size-4"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* CREATORS */}
        {showCreators && (
          <section
            id="creators"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16"
          >
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Styled by our creators
            </h2>
            <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-5">
              {creators.map((c) => (
                <Link
                  key={c.id}
                  to="/influencers/$slug"
                  params={{ slug: c.slug }}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lift sm:p-5"
                >
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.displayName}
                      loading="lazy"
                      className="size-12 rounded-full object-cover sm:size-14"
                    />
                  ) : (
                    <div className="grid size-12 place-items-center rounded-full bg-muted font-display text-lg font-medium text-muted-foreground sm:size-14">
                      {c.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium sm:text-base">
                      {c.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.followerCount >= 1_000_000
                        ? `${(c.followerCount / 1_000_000).toFixed(1)}M`
                        : c.followerCount >= 1_000
                        ? `${(c.followerCount / 1_000).toFixed(1)}K`
                        : c.followerCount}{" "}
                      followers
                      {c.country ? ` · ${c.country}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ABOUT / WHY STYLEAI — always shown */}
        <AboutSection />
      </main>

      <footer className="border-t border-border py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:gap-4 sm:px-6 sm:text-left">
          <span>© 2026 StyleAI</span>
          <span>
            AI style matches are estimates — always trust your own eye.
          </span>
        </div>
      </footer>
    </div>
  );
}

// ======================================================
// BRANDING HERO — shown when admin has no slides
// ======================================================
function BrandingHero({ onScrollToShop }: { onScrollToShop: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Decorative gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-background"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 size-[500px] rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            AI-styled fashion atelier
          </p>
          <h1 className="mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Fashion, curated by intelligence.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            StyleAI reads every piece, matches it with the right creators, and
            delivers a shopping experience shaped by real understanding — not
            algorithms alone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={onScrollToShop}>
              Explore the collection <ArrowRight />
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">Become a creator</Link>
            </Button>
          </div>

          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              ["AI-matched", "Every piece, understood"],
              ["Creator-led", "Styled by real voices"],
              ["Global", "Shipping worldwide"],
            ].map(([title, desc]) => (
              <div key={title}>
                <dt className="font-display text-lg font-medium tracking-tight sm:text-xl">
                  {title}
                </dt>
                <dd className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">
                  {desc}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// ABOUT — always shown at bottom
// ======================================================
function AboutSection() {
  const items = [
    {
      icon: Package,
      title: "Read every piece",
      body: "StyleAI understands fabric, cut, silhouette, and mood — not just tags and titles.",
    },
    {
      icon: Palette,
      title: "Styled by creators",
      body: "Real influencers style products from your favourite brands and share the look.",
    },
    {
      icon: Store,
      title: "One atelier",
      body: "Discover, match, and shop — all from a single AI-curated fashion experience.",
    },
  ];

  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Why StyleAI
          </p>
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            A different kind of fashion store.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We're building an atelier where every product is understood, every
            creator is real, and every recommendation is earned.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-medium">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================================================
// COMING SOON — shown when no products yet
// ======================================================
function ComingSoon() {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-border bg-card/30 px-6 py-14 text-center sm:mt-12 sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent/15 text-accent">
        <Sparkles className="size-5" />
      </span>
      <h3 className="mt-4 font-display text-xl font-medium">
        The first collection is on its way.
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Our team is hand-picking the launch lineup. New pieces drop soon —
        check back or follow us to be the first to know.
      </p>
    </div>
  );
}

// ======================================================
// HERO CAROUSEL — admin slides
// ======================================================
function HeroCarousel({
  slides,
  onScrollToShop,
}: {
  slides: StorefrontHeroSlide[];
  onScrollToShop: () => void;
}) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 6000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length]);

  function go(i: number) {
    setActive(i);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setActive((prev) => (prev + 1) % slides.length);
      }, 6000);
    }
  }

  const s = slides[active];
  if (!s) return null;

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="relative h-[60vh] min-h-[420px] w-full sm:h-[68vh] sm:min-h-[520px]">
        {slides.map((slide, i) => (
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt={slide.headline ?? ""}
            loading={i === 0 ? "eager" : "lazy"}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700",
              i === active ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 sm:pb-16">
            {s.headline && (
              <h1 className="max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {s.headline}
              </h1>
            )}
            {s.subheading && (
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {s.subheading}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              {s.ctaText &&
                (s.ctaLink?.startsWith("/") ? (
                  <Button asChild size="lg">
                    <Link to={s.ctaLink as any}>
                      {s.ctaText} <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" onClick={onScrollToShop}>
                    {s.ctaText} <ArrowRight />
                  </Button>
                ))}
            </div>

            {slides.length > 1 && (
              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => go((active - 1 + slides.length) % slides.length)}
                  className="grid size-9 place-items-center rounded-full border border-border bg-background/85 backdrop-blur-sm transition-colors hover:bg-background"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => go(i)}
                      aria-label={`Slide ${i + 1}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === active
                          ? "w-6 bg-foreground"
                          : "w-1.5 bg-foreground/40 hover:bg-foreground/70"
                      )}
                    />
                  ))}
                </div>
                <button
                  onClick={() => go((active + 1) % slides.length)}
                  className="grid size-9 place-items-center rounded-full border border-border bg-background/85 backdrop-blur-sm transition-colors hover:bg-background"
                  aria-label="Next slide"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// HELPERS
// ======================================================
function ChipButton({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? accent
            ? "border-accent bg-accent text-background"
            : "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ProductGrid({
  products,
  justAdded,
  onAdd,
}: {
  products: PublicProduct[];
  justAdded: string | null;
  onAdd: (p: PublicProduct) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          p={p}
          added={justAdded === p.id}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}

function ProductCarousel({
  products,
  justAdded,
  onAdd,
}: {
  products: PublicProduct[];
  justAdded: string | null;
  onAdd: (p: PublicProduct) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex gap-3 sm:gap-4">
        {products.map((p) => (
          <div key={p.id} className="w-[160px] shrink-0 sm:w-[220px]">
            <ProductCard
              p={p}
              added={justAdded === p.id}
              onAdd={onAdd}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  p,
  added,
  onAdd,
  compact,
}: {
  p: PublicProduct;
  added: boolean;
  onAdd: (p: PublicProduct) => void;
  compact?: boolean;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lift">
      <div className="relative">
        <ProductImageSlider
          images={p.images ?? []}
          alt={p.name}
          aspect="aspect-[3/4]"
          size="sm"
          showDots={false}
          showCounter={(p.images ?? []).length > 1}
          rounded="rounded-none"
        />
        <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-accent sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
          <Sparkles className="size-3" aria-hidden="true" /> {p.brand.name}
        </span>
      </div>

      <div className={cn("space-y-2.5 p-3 sm:space-y-3 sm:p-5", compact && "sm:p-3")}>
        <div>
          <h3
            className={cn(
              "font-display font-medium leading-snug",
              compact ? "text-sm sm:text-base" : "text-sm sm:text-lg"
            )}
          >
            {p.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
            {p.category}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium tabular-nums sm:text-base">
            {p.currency} {p.price?.toFixed(2)}
          </span>
          <Button
            size="sm"
            variant={added ? "secondary" : "default"}
            onClick={() => onAdd(p)}
            className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
          >
            {added ? (
              <>
                <Check className="size-3.5" /> Added
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}