import noirDress from "@/assets/p-noir-dress.jpg";
import leatherBag from "@/assets/p-leather-bag.jpg";
import ivoryHeels from "@/assets/p-ivory-heels.jpg";
import camelCoat from "@/assets/p-camel-coat.jpg";

export type AiStatus = "complete" | "processing" | "pending";

export type Product = {
  slug: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  image: string;
  inventory: number;
  ai: AiStatus;
  campaign: string | null;
  attributes: { label: string; value: string; confidence: number }[];
  audience: string;
  story: { title: string; body: string };
};

export const products: Product[] = [
  {
    slug: "noir-evening-dress",
    name: "Noir Evening Dress",
    sku: "LM-AW26-108",
    category: "Eveningwear",
    price: "$249",
    image: noirDress,
    inventory: 128,
    ai: "complete",
    campaign: "Autumn Atelier",
    attributes: [
      { label: "Category", value: "Dress", confidence: 94 },
      { label: "Style", value: "Luxury minimal", confidence: 91 },
      { label: "Occasion", value: "Evening", confidence: 96 },
      { label: "Colour", value: "Black", confidence: 98 },
      { label: "Season", value: "Autumn / Winter", confidence: 88 },
      { label: "Formality", value: "Formal", confidence: 93 },
    ],
    audience: "Female · 22–35 · Urban metros",
    story: {
      title: "A quiet kind of drama.",
      body: "Cut from fluid silk with a softly sculpted neckline, the Noir Evening Dress moves the way an evening should — unhurried, precise, entirely self-assured.",
    },
  },
  {
    slug: "luna-leather-handbag",
    name: "Luna Leather Handbag",
    sku: "LM-AW26-042",
    category: "Accessories",
    price: "$389",
    image: leatherBag,
    inventory: 64,
    ai: "complete",
    campaign: "Autumn Atelier",
    attributes: [
      { label: "Category", value: "Handbag", confidence: 97 },
      { label: "Style", value: "Quiet luxury", confidence: 92 },
      { label: "Occasion", value: "Daily · Work", confidence: 89 },
      { label: "Colour", value: "Tan", confidence: 95 },
      { label: "Season", value: "All season", confidence: 90 },
      { label: "Material", value: "Full-grain leather", confidence: 86 },
    ],
    audience: "Female · 25–40 · Professional",
    story: {
      title: "Built for the long commute and the late dinner.",
      body: "Structured full-grain leather, gold hardware, and a silhouette that holds its shape from the first morning to the hundredth.",
    },
  },
  {
    slug: "ivory-studio-heels",
    name: "Ivory Studio Heels",
    sku: "LM-SS26-311",
    category: "Footwear",
    price: "$219",
    image: ivoryHeels,
    inventory: 42,
    ai: "processing",
    campaign: null,
    attributes: [
      { label: "Category", value: "Pump", confidence: 95 },
      { label: "Style", value: "Modern classic", confidence: 88 },
      { label: "Occasion", value: "Event · Bridal", confidence: 84 },
      { label: "Colour", value: "Ivory", confidence: 97 },
      { label: "Season", value: "Spring / Summer", confidence: 87 },
      { label: "Heel", value: "100mm stiletto", confidence: 91 },
    ],
    audience: "Female · 24–38 · Occasion buyers",
    story: {
      title: "The last five percent of the look.",
      body: "A pared-back ivory pump with a hand-finished edge — designed to disappear into the outfit and hold it together at the same time.",
    },
  },
  {
    slug: "maison-oversized-coat",
    name: "Maison Oversized Coat",
    sku: "LM-AW26-070",
    category: "Outerwear",
    price: "$540",
    image: camelCoat,
    inventory: 26,
    ai: "pending",
    campaign: null,
    attributes: [
      { label: "Category", value: "Coat", confidence: 93 },
      { label: "Style", value: "Editorial minimal", confidence: 90 },
      { label: "Occasion", value: "Daily · Travel", confidence: 85 },
      { label: "Colour", value: "Camel", confidence: 96 },
      { label: "Season", value: "Autumn / Winter", confidence: 94 },
      { label: "Material", value: "Wool blend", confidence: 89 },
    ],
    audience: "Unisex-leaning · 26–45",
    story: {
      title: "One coat, an entire season.",
      body: "Dropped shoulders, a generous wrap, and a camel tone that reads warm in daylight and expensive at night.",
    },
  },
];

export const productBySlug = (slug: string) =>
  products.find((p) => p.slug === slug) ?? products[0]!;

export type Campaign = {
  slug: string;
  name: string;
  status: "Active" | "Draft" | "Completed";
  image: string;
  objective: string;
  budget: string;
  spent: string;
  influencers: number;
  posts: number;
  reach: string;
  impressions: string;
  clicks: string;
  conversions: string;
  revenue: string;
  roi: string;
  progress: number;
  window: string;
};

export const campaigns: Campaign[] = [
  {
    slug: "autumn-atelier",
    name: "Autumn Atelier",
    status: "Active",
    image: camelCoat,
    objective: "Revenue · AW26 launch",
    budget: "$24,000",
    spent: "$15,400",
    influencers: 12,
    posts: 36,
    reach: "1.2M",
    impressions: "3.4M",
    clicks: "42.6K",
    conversions: "3,210",
    revenue: "$48,240",
    roi: "9.6×",
    progress: 64,
    window: "1 Sep – 30 Oct",
  },
  {
    slug: "noir-evening",
    name: "Noir Evening Edit",
    status: "Active",
    image: noirDress,
    objective: "Conversions · Eveningwear",
    budget: "$12,000",
    spent: "$4,800",
    influencers: 6,
    posts: 14,
    reach: "486K",
    impressions: "1.1M",
    clicks: "17.2K",
    conversions: "1,142",
    revenue: "$19,600",
    roi: "6.8×",
    progress: 38,
    window: "12 Sep – 12 Nov",
  },
  {
    slug: "luna-accessories",
    name: "Luna Accessories",
    status: "Draft",
    image: leatherBag,
    objective: "Awareness · Accessories",
    budget: "$8,000",
    spent: "$0",
    influencers: 4,
    posts: 0,
    reach: "—",
    impressions: "—",
    clicks: "—",
    conversions: "—",
    revenue: "—",
    roi: "—",
    progress: 0,
    window: "Starts 1 Oct",
  },
];

export const campaignBySlug = (slug: string) =>
  campaigns.find((c) => c.slug === slug) ?? campaigns[0]!;

export const revenueSeries = [
  { day: "Wk 1", revenue: 4200, conversions: 240 },
  { day: "Wk 2", revenue: 6100, conversions: 386 },
  { day: "Wk 3", revenue: 5400, conversions: 331 },
  { day: "Wk 4", revenue: 9300, conversions: 604 },
  { day: "Wk 5", revenue: 11200, conversions: 742 },
  { day: "Wk 6", revenue: 12040, conversions: 907 },
];

export const channelSeries = [
  { channel: "Instagram", revenue: 26400 },
  { channel: "TikTok", revenue: 12900 },
  { channel: "YouTube", revenue: 6100 },
  { channel: "Blog", revenue: 2840 },
];

export const insights = [
  {
    title: "Maya Khan generated 2.4× more revenue than creators of similar size.",
    reason:
      "Her audience overlaps 96% with your eveningwear buyers and her posts convert at 3.1% versus a 1.3% roster average.",
    confidence: 92,
    action: "Increase her allocation by $2,400",
  },
  {
    title: "Luxury campaigns perform 31% better with 70%+ female audiences.",
    reason:
      "Across your last nine campaigns, creators above that threshold delivered a higher ROI at the same spend level.",
    confidence: 84,
    action: "Apply the filter to Noir Evening Edit",
  },
  {
    title: "Maison Oversized Coat has strong audience fit but no campaign.",
    reason:
      "Product intelligence rates its creator fit at 88, yet it has never been included in a live campaign.",
    confidence: 78,
    action: "Create a campaign from this product",
  },
];

export const activation = [
  { label: "Brand profile", done: true },
  { label: "First product", done: true },
  { label: "AI analysis", done: true },
  { label: "Influencer match", done: false },
  { label: "First campaign", done: false },
];

export const knowledgeDocs = [
  { name: "Lumen Brand Guidelines 2026", type: "Brand guidelines", chunks: 412, status: "Indexed", updated: "2 days ago" },
  { name: "AW26 Product Catalog", type: "Product catalog", chunks: 1284, status: "Indexed", updated: "5 hours ago" },
  { name: "Spring Campaign Retrospective", type: "Previous campaigns", chunks: 96, status: "Embedding", updated: "12 minutes ago" },
  { name: "Tone of Voice — Editorial", type: "Marketing documents", chunks: 58, status: "Indexed", updated: "3 weeks ago" },
];

export const team = [
  { name: "Eshem Waseem", role: "Owner", status: "Active", active: "Now", email: "eshem@lumenatelier.com" },
  { name: "Hira Siddiqui", role: "Marketing Manager", status: "Active", active: "2 hours ago", email: "hira@lumenatelier.com" },
  { name: "Daniyal Raza", role: "Content Manager", status: "Active", active: "Yesterday", email: "daniyal@lumenatelier.com" },
  { name: "Fatima Sheikh", role: "Product Manager", status: "Invited", active: "—", email: "fatima@lumenatelier.com" },
  { name: "Omar Javed", role: "Analyst", status: "Active", active: "4 days ago", email: "omar@lumenatelier.com" },
];

export const brands = ["Lumen Atelier", "Maison Noir", "Studio Ivory", "Corso Nine"];