// frontend/src/lib/seo.ts
const SITE_URL =
  (import.meta as any).env?.VITE_PUBLIC_URL || "https://styleai.com";

export const SEO = {
  siteUrl: SITE_URL,

  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "StyleAI",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    sameAs: [],
  },

  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "StyleAI",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },

  product: (p: {
    id: string;
    name: string;
    sku?: string;
    description?: string | null;
    category?: string | null;
    price?: number | null;
    currency?: string | null;
    primaryImage?: string | null;
    brand?: { name: string };
  }) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.description || undefined,
    image: p.primaryImage ? [p.primaryImage] : undefined,
    category: p.category || undefined,
    brand: { "@type": "Brand", name: p.brand?.name || "StyleAI" },
    offers:
      p.price != null
        ? {
            "@type": "Offer",
            price: String(p.price),
            priceCurrency: p.currency || "USD",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/shop/product/${p.id}`,
          }
        : undefined,
  }),

  collection: (name: string, path: string, description?: string) => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: `${SITE_URL}${path}`,
    description: description || `Browse ${name} on StyleAI.`,
  }),
};