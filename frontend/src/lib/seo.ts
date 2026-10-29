// frontend/src/lib/seo.ts

// Normalize SITE_URL — strips trailing slash to prevent `https://site.com//shop/...`
const rawUrl = import.meta.env?.VITE_PUBLIC_URL || "https://styleai.com";
const SITE_URL = rawUrl.replace(/\/+$/, "");

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
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
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
    inStock?: boolean;
  }) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku || undefined,
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
            availability:
              p.inStock !== false
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: `${SITE_URL}/shop/product/${p.id}`,
            seller: {
              "@type": "Organization",
              name: p.brand?.name || "StyleAI",
            },
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

  breadcrumb: (items: Array<{ name: string; path: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }),

  itemList: (
    products: Array<{
      id: string;
      name: string;
      primaryImage?: string | null;
    }>
  ) => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/shop/product/${p.id}`,
      name: p.name,
      ...(p.primaryImage ? { image: p.primaryImage } : {}),
    })),
  }),
};