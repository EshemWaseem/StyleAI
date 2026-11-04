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
    image: "/brand.jpg",
    imageAlt: "Fashion brand owner surrounded by clothing products in a showroom",
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
    image: "/influencer.jpg",
    imageAlt: "Fashion creator working on a professional photoshoot in a studio",
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
    image: "/agency.jpg",
    imageAlt: "Marketing agency team working together in a professional office",
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
    image: "/shoppper.jpg",
    imageAlt: "Shopper exploring clothing and fashion products in a retail store",
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
    <div className="why-page">
      <PublicHeader cartCount={cart.count} />

      <main>
        {/* HERO */}
        <section className="why-hero">
          <div className="why-hero-bg" />
          <div className="why-hero-noise" />

          <div className="why-hero-content">
            <div className="why-hero-badge">
              <Sparkles className="size-3.5" />
              <span>The Operating System for Fashion Commerce</span>
            </div>

            <h1 className="why-hero-title">
              Where fashion meets
              <br className="hidden sm:block" />{" "}
              <span className="why-hero-title-accent">
                artificial intelligence.
              </span>
            </h1>

            <p className="why-hero-desc">
              Whether you&apos;re a brand, creator, agency, or shopper —
              StyleAI connects every piece of the fashion ecosystem with AI
              that understands style, matches creators, and drives measurable
              growth.
            </p>

            <div className="why-hero-actions">
              <Button className="why-btn-large" asChild>
                <Link to="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <Button variant="outline" className="why-btn-large" asChild>
                <Link to="/shop">Browse Collection</Link>
              </Button>
            </div>

            <div className="why-hero-features">
              <span className="why-hero-feature">
                <CheckCircle2 className="size-4 text-accent" />
                Built for the fashion ecosystem
              </span>
              <span className="why-hero-feature">
                <CheckCircle2 className="size-4 text-accent" />
                AI-powered workflows
              </span>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="why-stats">
          <div className="why-stats-grid">
            {STATS.map((stat) => (
              <div key={stat.label} className="why-stat-item">
                <stat.icon className="why-stat-icon" />
                <p className="why-stat-value">{stat.value}</p>
                <p className="why-stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PERSONAS */}
        <section className="why-personas">
          {PERSONAS.map((persona, index) => {
            const Icon = persona.icon;

            return (
              <article key={persona.id} className="why-persona-row">
                {/* Persona information */}
                <div className="why-persona-content">
                  <div className="why-persona-badge">
                    <Icon className="size-3.5" />
                    {persona.label}
                  </div>

                  <h2 className="why-persona-title">{persona.title}</h2>

                  <p className="why-persona-desc">{persona.description}</p>

                  <ul className="why-persona-features">
                    {persona.features.map((feature) => (
                      <li key={feature} className="why-persona-feature">
                        <span className="why-persona-feature-icon">
                          <CheckCircle2 className="size-3.5" />
                        </span>
                        <span className="why-persona-feature-text">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="why-persona-cta">
                    <Button className="why-persona-btn" asChild>
                      <Link to={persona.ctaLink}>
                        {persona.cta}
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Real persona photography */}
                <div className="why-persona-visual">
                  <div className="why-image-card">
                    <div className="why-image-wrapper">
                      <img
                        src={persona.image}
                        alt={persona.imageAlt}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="why-image"
                      />

                      <div className="why-image-overlay" />

                      <div className="why-image-tag">
                        <span className="why-image-tag-dot" />
                        StyleAI Ecosystem
                      </div>

                      <div className="why-image-caption">
                        <div className="why-image-caption-icon">
                          <Icon className="size-5" />
                        </div>

                        <h3 className="why-image-caption-title">
                          {persona.imageLabel}
                        </h3>

                        <p className="why-image-caption-desc">
                          {persona.imageDescription}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="why-image-footer">
                    One platform. More possibilities for fashion.
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        {/* FINAL CTA */}
        <section className="why-cta">
          <div className="why-cta-bg" />

          <div className="why-cta-content">
            <div className="why-cta-badge">
              <Sparkles className="size-3.5" />
              Fashion, connected
            </div>

            <h2 className="why-cta-title">
              Ready to join the future of fashion?
            </h2>

            <p className="why-cta-desc">
              Whether you&apos;re selling, creating, managing, or shopping —
              StyleAI brings the industry together on one intelligent platform.
            </p>

            <div className="why-cta-actions">
              <Button className="why-cta-btn" asChild>
                <Link to="/register">
                  Create an account
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>

              <Button variant="outline" className="why-cta-btn" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>

            <p className="why-cta-note">
              No credit card required for shoppers. 14-day free trial for
              brands &amp; agencies.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}