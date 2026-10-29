
import { createFileRoute, Link } from "@tanstack/react-router";
import { SEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/shop/public-header";
import { useCart } from "@/lib/cart";
import {
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  Users,
  Briefcase,
  Store,
  Palette,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/why-styleai")({
  head: () => ({
    meta: [
      {
        title: "Why StyleAI — The Operating System for Fashion Commerce",
      },
      {
        name: "description",
        content:
          "Discover why brands, creators, agencies, and shoppers choose StyleAI. AI-powered product understanding, influencer matching, and seamless commerce.",
      },
      {
        property: "og:title",
        content: "Why StyleAI — The Operating System for Fashion Commerce",
      },
      {
        property: "og:description",
        content:
          "Discover why brands, creators, agencies, and shoppers choose StyleAI.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: SEO.siteUrl + "/why-styleai",
      },
      {
        property: "og:image",
        content: SEO.siteUrl + "/og-default.jpg",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "canonical",
        href: SEO.siteUrl + "/why-styleai",
      },
    ],
  }),
  component: WhyStyleAIPage,
});

const PERSONAS = [
  {
    id: "brands",
    label: "For Brands",
    icon: Store,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    shadowColor: "shadow-blue-500/10",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    image: "/brand.jpg",
    imageAlt:
      "Fashion brand owner surrounded by clothing products in a showroom",
    imageLabel: "Build your fashion brand",
    imageDescription: "Turn products into growth opportunities.",
    title: "Move every product from understanding to measurable growth.",
    description:
      "StyleAI reads your catalog like a merchandiser and markets it like a top-tier agency.",
    features: [
      "AI product understanding extracts attributes, audience, and occasion.",
      "Match products with perfectly aligned creators using AI scoring.",
      "Generate ad copy, photography, and campaigns in seconds.",
      "Track revenue, ROI, and creator performance in one dashboard.",
    ],
    cta: "Start as a Brand",
    ctaLink: "/register?role=BRAND_OWNER",
  },
  {
    id: "creators",
    label: "For Creators",
    icon: Palette,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
    shadowColor: "shadow-pink-500/10",
    gradient: "from-pink-500/20 via-pink-500/5 to-transparent",
    image: "/influencer.jpg",
    imageAlt:
      "Fashion creator working on a professional photoshoot in a studio",
    imageLabel: "Create your next opportunity",
    imageDescription: "Connect your creativity with the right brands.",
    title: "Your creative business, in motion.",
    description:
      "Get discovered by brands that fit your vibe, set your rates, and manage collabs without the admin.",
    features: [
      "Build a portfolio that showcases your style and audience metrics.",
      "Get matched with brands that align with your niche and pricing.",
      "Negotiate and accept offers directly on the platform.",
      "Track earnings, campaign deliverables, and payouts in one place.",
    ],
    cta: "Join as a Creator",
    ctaLink: "/register?role=INFLUENCER",
  },
  {
    id: "agencies",
    label: "For Agencies",
    icon: Briefcase,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    shadowColor: "shadow-purple-500/10",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    image: "/agency.jpg",
    imageAlt:
      "Marketing agency team working together in a professional office",
    imageLabel: "Scale your agency",
    imageDescription: "Manage brands and campaigns in one place.",
    title: "Manage multiple brands and run ads at scale.",
    description:
      "From creator approvals to Meta ad campaigns, StyleAI is your operating system for client growth.",
    features: [
      "Manage multiple client brands with dedicated workspaces.",
      "Hire photographers, videographers, and creators for your clients.",
      "Launch Meta and Google campaigns with AI-generated strategy.",
      "Track cross-brand performance and portfolio revenue.",
    ],
    cta: "Start as an Agency",
    ctaLink: "/register?role=AGENCY",
  },
  {
    id: "shoppers",
    label: "For Shoppers",
    icon: ShoppingBag,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    shadowColor: "shadow-amber-500/10",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    image: "/shoppper.jpg",
    imageAlt:
      "Shopper exploring clothing and fashion products in a retail store",
    imageLabel: "Discover your style",
    imageDescription: "Find fashion that feels like you.",
    title: "Fashion, curated by intelligence.",
    description:
      "Discover pieces that match your style and see them styled by real creators before you buy.",
    features: [
      "Browse a curated collection of fashion from vetted brands.",
      "See real outfits styled by creators you follow.",
      "Shop with confidence with AI-powered product details.",
      "Fast checkout with Stripe or Cash on Delivery.",
    ],
    cta: "Start Shopping",
    ctaLink: "/shop",
  },
];

const STATS = [
  { label: "Active Creators", value: "10K+", icon: Users },
  { label: "Brands Onboarded", value: "500+", icon: Store },
  { label: "AI Matches Made", value: "1M+", icon: Sparkles },
  { label: "Revenue Generated", value: "$50M+", icon: TrendingUp },
];

function WhyStyleAIPage() {
  const cart = useCart();

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <PublicHeader cartCount={cart.count} />

      <main>
        {/* HERO */}
        <section className="relative isolate overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-32 lg:pb-32 lg:pt-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/15 via-background to-background" />

          <div className="absolute inset-0 -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" />
              <span>The Operating System for Fashion Commerce</span>
            </div>

            <h1 className="font-display text-5xl font-medium leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Where fashion meets
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-accent to-accent/50 bg-clip-text text-transparent">
                artificial intelligence.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Whether you&apos;re a brand, creator, agency, or shopper —
              StyleAI connects every piece of the fashion ecosystem with AI
              that understands style, matches creators, and drives measurable
              growth.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                className="h-12 px-8 text-base shadow-lg shadow-accent/20 transition-all hover:scale-105"
                asChild
              >
                <Link to="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base transition-all hover:bg-accent/5"
                asChild
              >
                <Link to="/shop">Browse Collection</Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-accent" />
                Built for the fashion ecosystem
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-accent" />
                AI-powered workflows
              </span>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="border-y border-border bg-card/30 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center bg-background p-6 text-center sm:p-8"
                >
                  <stat.icon className="mb-3 size-6 text-accent/70" />
                  <p className="font-display text-3xl font-medium text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PERSONAS */}
        <section className="mx-auto max-w-6xl space-y-24 px-4 py-24 sm:px-6 sm:py-32 lg:space-y-32">
          {PERSONAS.map((persona, index) => {
            const Icon = persona.icon;
            const isReversed = index % 2 === 1;

            return (
              <article
                key={persona.id}
                className={cn(
                  "flex flex-col items-center gap-10 sm:gap-12 lg:gap-20",
                  isReversed ? "lg:flex-row-reverse" : "lg:flex-row",
                )}
              >
                {/* Persona information */}
                <div className="w-full flex-1 space-y-7">
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                      persona.bgColor,
                      persona.color,
                    )}
                  >
                    <Icon className="size-3.5" />
                    {persona.label}
                  </div>

                  <h2 className="font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                    {persona.title}
                  </h2>

                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {persona.description}
                  </p>

                  <ul className="space-y-4 pt-1">
                    {persona.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                            persona.bgColor,
                          )}
                        >
                          <CheckCircle2
                            className={cn("size-3.5", persona.color)}
                          />
                        </span>

                        <span className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <Button
                      asChild
                      size="lg"
                      className="group h-12 px-7 shadow-md transition-all hover:scale-[1.02]"
                    >
                      <Link to={persona.ctaLink}>
                        {persona.cta}
                        <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Real persona photography */}
                <div className="w-full flex-1">
                  <div
                    className={cn(
                      "group relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br p-1 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl",
                      persona.borderColor,
                      persona.gradient,
                      persona.shadowColor,
                    )}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] bg-muted sm:aspect-[5/4] lg:aspect-[4/3]">
                      <img
                        src={persona.image}
                        alt={persona.imageAlt}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="absolute inset-0 size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />

                      {/* Readable caption over the image */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/5" />

                      <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md sm:left-6 sm:top-6">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        StyleAI Ecosystem
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8">
                        <div className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-lg backdrop-blur-md">
                          <Icon className="size-5" />
                        </div>

                        <h3 className="font-display text-2xl font-medium tracking-tight text-white sm:text-3xl">
                          {persona.imageLabel}
                        </h3>

                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
                          {persona.imageDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-center text-xs text-muted-foreground lg:text-left">
                    One platform. More possibilities for fashion.
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        {/* FINAL CTA */}
        <section className="relative isolate overflow-hidden border-t border-border bg-card/50">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />

          <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" />
              Fashion, connected
            </div>

            <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Ready to join the future of fashion?
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Whether you&apos;re selling, creating, managing, or shopping —
              StyleAI brings the industry together on one intelligent platform.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="h-14 px-8 text-base shadow-xl shadow-accent/20 transition-all hover:scale-105"
                asChild
              >
                <Link to="/register">
                  Create an account
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              No credit card required for shoppers. 14-day free trial for
              brands &amp; agencies.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
