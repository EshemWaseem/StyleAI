// routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, Menu, Minus, Plus,
  Search, ShoppingBag, Sparkles, Trash2, Package, Palette, Store, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import {
  publicProductsApi, publicStorefrontApi,
  type PublicProduct, type PublicBrand, type StorefrontHeroSlide,
  type StorefrontSectionPublic, type StorefrontEditorial, type StorefrontCreator,
} from "@/lib/products";
import { deriveCategories } from "@/lib/categories";
import type { GenderStat, CategoryStat } from "@/lib/categories";
import { SEO } from "@/lib/seo";
import { ProductCard } from "@/components/shop/product-card";
import { CategoryGrid } from "@/components/shop/category-grid";
import {
  CategoryGridSkeleton, ProductGridSkeleton,
} from "@/components/ui/skeletons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StyleAI — Shop the AI-styled fashion atelier" },
      { name: "description", content: "Shop the StyleAI collection — dresses, outerwear, bags and footwear styled by AI, matched with creators, and delivered worldwide." },
      { property: "og:title", content: "StyleAI — AI-styled fashion atelier" },
      { property: "og:description", content: "AI-curated fashion from real creators and brands." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SEO.siteUrl + "/" },
      { property: "og:image", content: SEO.siteUrl + "/og-default.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "StyleAI — AI-styled fashion atelier" },
      { name: "twitter:description", content: "AI-curated fashion from real creators and brands." },
    ],
    links: [{ rel: "canonical", href: SEO.siteUrl + "/" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(SEO.website) },
      { type: "application/ld+json", children: JSON.stringify(SEO.organization) },
    ],
  }),
  component: Storefront,
});

const DEFAULT_EDITORIAL: StorefrontEditorial = {
  id: "default-editorial",
  title: "Behind every piece: the StyleAI loop.",
  steps: ["Product", "Understand", "Match", "Create", "Launch", "Measure"],
  isActive: true,
};

const SECTIONS = [
  { id: "shop", label: "Shop" },
  { id: "edit", label: "Editorial" },
  { id: "creators", label: "Creators" },
] as const;

const NAV_OFFSET = 80;

function useSmoothScrollTo(offset = NAV_OFFSET) {
  return useCallback((id: string | null, onDone?: () => void) => {
    if (typeof window === "undefined") return;
    if (!id || id === "top" || id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (history.replaceState) history.replaceState(null, "", window.location.pathname);
      onDone?.();
      return;
    }
    const el = document.getElementById(id);
    if (!el) { onDone?.(); return; }
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    if (history.replaceState) history.replaceState(null, "", `#${id}`);
    window.setTimeout(() => onDone?.(), 350);
  }, [offset]);
}

function useScrollSpy(ids: readonly string[], offset = NAV_OFFSET) {
  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined" || ids.length === 0) return;
    let rafId: number | null = null;
    const update = () => {
      rafId = null;
      if (window.scrollY < 80) { setActiveId(""); return; }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40;
      if (atBottom) { setActiveId(ids[ids.length - 1]); return; }
      const probeY = window.scrollY + offset + 60;
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= probeY) current = id; else break;
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

  const [genders, setGenders] = useState<GenderStat[]>([]);
  const [categoriesStat, setCategoriesStat] = useState<CategoryStat[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const cart = useCart();
  const scrollTo = useSmoothScrollTo(NAV_OFFSET);
  const activeSection = useScrollSpy(SECTIONS.map((s) => s.id), NAV_OFFSET);

  useEffect(() => {
    publicProductsApi.brands().then((res) => setBrands(res.brands)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    publicProductsApi.list({
      brand: activeBrand || undefined,
      category: filter !== "All" ? filter : undefined,
      search: query.trim() || undefined,
    })
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeBrand, filter, query]);

  useEffect(() => {
    setCategoriesLoading(true);
    publicProductsApi.list({ limit: 500 })
      .then((r) => {
        const derived = deriveCategories(r.products);
        setGenders(derived.genders);
        setCategoriesStat(derived.categories);
      })
      .catch(() => {
        setGenders([]);
        setCategoriesStat([]);
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    publicStorefrontApi.get().then((r) => {
      setHeroSlides(r.hero || []);
      setSections(r.sections || []);
      setEditorial(r.editorial || null);
      setCreators(r.creators || []);
    }).catch(() => {
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

  const editorialToShow: StorefrontEditorial =
    editorial && editorial.steps && editorial.steps.length > 0
      ? editorial
      : DEFAULT_EDITORIAL;

  const validHeroSlides = useMemo(
    () => heroSlides.filter((s) => s && s.imageUrl),
    [heroSlides]
  );
  const hasHeroSlides = validHeroSlides.length > 0;

  const filterChips = useMemo(
    () => ["All", ...categoriesStat.map((c) => c.name)],
    [categoriesStat]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <span className="font-display text-[15px] font-medium tracking-tight">StyleAI</span>
          </button>

          <nav className="ml-6 hidden items-center gap-6 text-sm lg:flex" aria-label="Main">
            {SECTIONS.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative py-1 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
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
            <Link to="/shop" className="text-muted-foreground transition-colors hover:text-foreground">
              All products
            </Link>
            <Link to="/why-styleai" className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent transition-all hover:bg-accent/20 hover:scale-105">
            Why StyleAI?
            <ArrowRight className="size-3.5" />
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
              <Link to="/register" search={{ role: "SHOPPER" } as any}>Just shopping?</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
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
              <CartSheet cart={cart} />
            </Sheet>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  className="grid size-9 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-accent/10 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[280px] flex-col sm:max-w-xs">
                <SheetHeader>
                  <SheetTitle className="font-display text-lg font-medium">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleMobileNavClick(s.id)}
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm",
                        activeSection === s.id
                          ? "bg-accent/10 text-foreground"
                          : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                      )}
                    >
                      <span>{s.label}</span>
                    </button>
                  ))}
                 <Link
                        to="/shop"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-accent/5 hover:text-foreground">
                        All products
                      </Link>
                      <Link
                        to="/why-styleai"
                        onClick={() => setMobileNavOpen(false)}
                        className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-accent/5">
                        Why StyleAI?
                      </Link>
                      </nav>
                <div className="mt-auto space-y-2 border-t border-border pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={() => setMobileNavOpen(false)}>Login</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/register" search={{ role: "SHOPPER" } as any} onClick={() => setMobileNavOpen(false)}>
                      Just shopping?
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/register" onClick={() => setMobileNavOpen(false)}>Register</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        {hasHeroSlides ? (
          <HeroCarousel slides={validHeroSlides} onScrollToShop={() => scrollTo("shop")} />
        ) : (
          <BrandingHero onScrollToShop={() => scrollTo("shop")} />
        )}

        {categoriesLoading ? (
          <section className="border-t border-border">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <div className="mb-6 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Browse
                </p>
                <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  Shop by category
                </h2>
              </div>
              <CategoryGridSkeleton />
            </div>
          </section>
        ) : (
          <CategoryGrid genders={genders} categories={categoriesStat} />
        )}

        <section id="shop" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  Featured pieces
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : products.length === 0
                    ? "Pieces from approved brands"
                    : `${products.length} piece${products.length === 1 ? "" : "s"} available now.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {products.length > 0 && (
                  <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-64">
                    <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                    <input
                      aria-label="Search the collection"
                      placeholder="Search pieces…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link to="/shop">
                    Browse all <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {brands.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Brands
                </p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  <ChipButton active={activeBrand === ""} onClick={() => setActiveBrand("")}>
                    All brands
                  </ChipButton>
                  {brands.map((b) => (
                    <ChipButton
                      key={b.id}
                      active={activeBrand === b.slug}
                      onClick={() => setActiveBrand(b.slug)}
                    >
                      {b.name}
                      <span className="ml-1.5 text-xs opacity-60">{b.productCount}</span>
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}

            {filterChips.length > 1 && (
              <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {filterChips.map((c) => (
                  <ChipButton key={c} accent active={filter === c} onClick={() => setFilter(c)}>
                    {c}
                  </ChipButton>
                ))}
              </div>
            )}

            {loading ? (
              <div className="mt-6 sm:mt-8">
                <ProductGridSkeleton count={8} />
              </div>
            ) : products.length === 0 ? (
              <ComingSoon />
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} added={justAdded === p.id} onAdd={addToCart} />
                ))}
              </div>
            )}
          </div>
        </section>

        {sections.map((sec) => (
          <section key={sec.id} className="scroll-mt-20 border-t border-border bg-card/30">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                    {sec.title}
                  </h2>
                  {sec.subtitle && (
                    <p className="mt-2 text-sm text-muted-foreground">{sec.subtitle}</p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/shop">View all</Link>
                </Button>
              </div>
              {sec.layout === "CAROUSEL" ? (
                <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                  <div className="flex gap-3 sm:gap-4">
                    {sec.products.map((p) => (
                      <div key={p.id} className="w-[160px] shrink-0 sm:w-[220px]">
                        <ProductCard p={p} added={justAdded === p.id} onAdd={addToCart} compact />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                  {sec.products.map((p) => (
                    <ProductCard key={p.id} p={p} added={justAdded === p.id} onAdd={addToCart} />
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}

        <section id="edit" className="scroll-mt-20 border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="max-w-lg font-display text-2xl font-medium tracking-tight sm:text-3xl">
              {editorialToShow.title}
            </h2>
            <ol className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 sm:mt-8 sm:gap-y-4">
              {editorialToShow.steps.map((step, i) => (
                <li key={`${step}-${i}`} className="flex items-center gap-3">
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                    {step}
                  </span>
                  {i < editorialToShow.steps.length - 1 && (
                    <ArrowRight className="size-3.5 text-muted-foreground sm:size-4" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="creators" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Styled by our creators
            </h2>
            {creators.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link to="/influencers">
                  See all creators <ArrowRight />
                </Link>
              </Button>
            )}
          </div>

          {creators.length > 0 ? (
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
                    <p className="truncate text-sm font-medium sm:text-base">{c.displayName}</p>
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
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-gradient-to-r from-accent/5 via-transparent to-transparent p-6 sm:mt-8 sm:p-8">
              <div className="flex flex-wrap items-center gap-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                  <UsersRound className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-medium">Be among the first creators.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    StyleAI features real creators styling real products. Apply to join our creator program — brands will discover you.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link to="/register" search={{ role: "INFLUENCER" } as any}>
                        Join as creator <ArrowRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/why-styleai">Learn more</Link>
                    </Button>
                  </div>
              </div>
            </div>
          )}
        </section>

        <AboutSection />
      </main>

      <footer className="border-t border-border py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-between sm:gap-4 sm:px-6 sm:text-left">
          <span>© 2026 StyleAI</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>AI style matches are estimates — always trust your own eye.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CartSheet({ cart }: { cart: ReturnType<typeof useCart> }) {
  return (
    <SheetContent className="flex w-full flex-col sm:max-w-md">
      <SheetHeader>
        <SheetTitle className="font-display text-xl font-medium">Your bag</SheetTitle>
      </SheetHeader>
      {cart.items.length === 0 ? (
        <p className="mt-8 px-4 text-sm text-muted-foreground">
          Your bag is empty. Add a piece from the collection to begin.
        </p>
      ) : (
        <ul className="mt-4 flex-1 space-y-4 overflow-y-auto px-4">
          {cart.items.map((item) => (
            <li key={item.slug} className="flex gap-3 border-b border-border pb-4">
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
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => cart.setQty(item.slug, item.qty - 1)}
                    aria-label={`Decrease ${item.name}`}
                    className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent/10"
                  >
                    <Minus className="size-3" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => cart.setQty(item.slug, item.qty + 1)}
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
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-display text-xl tabular-nums">
            ${cart.total.toFixed(2)}
          </span>
        </div>
        <Button asChild className="w-full" disabled={cart.items.length === 0}>
          <Link to="/checkout">
            Checkout <ArrowRight />
          </Link>
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Shipping and taxes calculated at checkout.
        </p>
      </div>
    </SheetContent>
  );
}

function BrandingHero({ onScrollToShop }: { onScrollToShop: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
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
            StyleAI reads every piece, matches it with the right creators, and delivers a shopping experience shaped by real understanding — not algorithms alone.
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
                <dt className="font-display text-lg font-medium tracking-tight sm:text-xl">{title}</dt>
                <dd className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const items = [
    { icon: Package, title: "Read every piece", body: "StyleAI understands fabric, cut, silhouette, and mood — not just tags and titles." },
    { icon: Palette, title: "Styled by creators", body: "Real influencers style products from your favourite brands and share the look." },
    { icon: Store, title: "One atelier", body: "Discover, match, and shop — all from a single AI-curated fashion experience." },
  ];
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Why StyleAI</p>
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">
            A different kind of fashion store.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We're building an atelier where every product is understood, every creator is real, and every recommendation is earned.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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
        Our team is hand-picking the launch lineup. New pieces drop soon — check back or follow us to be the first to know.
      </p>
    </div>
  );
}

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
                        i === active ? "w-6 bg-foreground" : "w-1.5 bg-foreground/40 hover:bg-foreground/70"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {active + 1} / {slides.length}
                </span>
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