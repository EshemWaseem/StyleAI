import heroEditorial from "@/assets/hero-editorial.jpg";
import noirDress from "@/assets/p-noir-dress.jpg";
import leatherBag from "@/assets/p-leather-bag.jpg";
import ivoryHeels from "@/assets/p-ivory-heels.jpg";
import camelCoat from "@/assets/p-camel-coat.jpg";

export type EditorialCategory =
  | "Styling"
  | "Trends"
  | "Craft"
  | "Interview"
  | "Lookbook";

export interface EditorialStory {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: EditorialCategory;
  readTime: string;
  author: string;
  publishedAt: string;
  featured?: boolean;
  body: string[];
  pullQuote?: string;
}

export const editorialStories: EditorialStory[] = [
  {
    slug: "art-of-the-evening-dress",
    title: "The art of the evening dress",
    excerpt:
      "How a single silhouette moves from drawing board to red carpet — and why fewer pieces, made better, is the modern luxury.",
    coverImage: noirDress,
    category: "Craft",
    readTime: "6 min read",
    author: "Ayesha Khan",
    publishedAt: "12 September 2026",
    featured: true,
    body: [
      "There is a quiet drama in a well-cut evening dress. It does not shout. It arrives.",
      "We spent four months developing the Noir silhouette — not because the shape was complicated, but because the fall of the fabric had to be exactly right. Italian silk crepe, cut on a slight bias, weighted so that movement feels unhurried.",
      "The result is a dress that asks very little of the woman wearing it. She simply has to be herself.",
    ],
    pullQuote:
      "Luxury is not a louder fabric. It is the absence of the unnecessary.",
  },
  {
    slug: "autumn-winter-26-editors-picks",
    title: "AW26: the pieces we are actually wearing",
    excerpt:
      "Six editors, six cities, one question — what from this season's collection earns a place in your wardrobe?",
    coverImage: camelCoat,
    category: "Trends",
    readTime: "4 min read",
    author: "Studio Desk",
    publishedAt: "08 September 2026",
    body: [
      "Every season brings a flood of newness. The trick is knowing what will still feel right a year from now.",
      "This autumn, our editors gravitated toward weight and warmth — camel wool, structured leather, and a quiet return to tailoring.",
      "The Maison Oversized Coat was the most-photographed piece across all six cities, worn open in Milan and belted in Copenhagen.",
    ],
    pullQuote: "Trends fade. Proportion is what lasts.",
  },
  {
    slug: "meet-the-maker-noors-collection",
    title: "Meet the maker: Noor's Collection",
    excerpt:
      "A conversation with Noor Fatima about heritage craft, slow fashion, and building a label from Lahore to the world.",
    coverImage: leatherBag,
    category: "Interview",
    readTime: "8 min read",
    author: "StyleAI Editorial",
    publishedAt: "01 September 2026",
    body: [
      "Noor Fatima did not set out to start a fashion label. She set out to make one bag, properly.",
      "That bag became the Luna — a structured crossbody in full-grain leather that has since become a quiet signature of her studio.",
      "We spoke with Noor about the slow rituals of her atelier, the artisans she works with in Sialkot, and why she still refuses to scale faster than she can personally inspect every stitch.",
    ],
    pullQuote: "If you cannot sign your name to it, do not ship it.",
  },
  {
    slug: "how-to-style-ivory-heels",
    title: "How to style ivory heels for real life",
    excerpt:
      "Five outfits from morning meetings to evening dinners — proving the ivory pump works far beyond the wedding aisle.",
    coverImage: ivoryHeels,
    category: "Styling",
    readTime: "5 min read",
    author: "Zara Lin",
    publishedAt: "28 August 2026",
    body: [
      "The ivory heel has a reputation problem: it reads bridal, and only bridal. That reputation is undeserved.",
      "Paired with raw denim and a cream knit, ivory reads architectural. With a black slip dress, it reads Parisian. With tailored trousers, it reads quietly powerful.",
      "The trick is contrast. Ivory works best when the outfit is playing a different register entirely.",
    ],
    pullQuote: "Ivory does not need a special occasion. It creates one.",
  },
  {
    slug: "the-quiet-luxury-edit",
    title: "The quiet luxury edit: 8 pieces, endless outfits",
    excerpt:
      "Build a capsule wardrobe from eight essentials that mix, match, and travel in a single carry-on.",
    coverImage: heroEditorial,
    category: "Lookbook",
    readTime: "3 min read",
    author: "Studio Desk",
    publishedAt: "22 August 2026",
    body: [
      "Quiet luxury is not a trend. It is a discipline — the discipline of buying fewer, better things.",
      "We curated eight pieces that are deliberately unremarkable on their own and quietly extraordinary together: two tailored pieces, three layering essentials, two accessories, one pair of heels.",
      "The entire capsule fits in a single carry-on, and yields more than twenty distinct outfits across a two-week trip.",
    ],
    pullQuote: "A capsule wardrobe is not small. It is precise.",
  },
  {
    slug: "behind-the-ai-style-loop",
    title: "Behind the AI style loop",
    excerpt:
      "How StyleAI reads a product, understands a buyer, and matches the two — without ever losing the human in the middle.",
    coverImage: heroEditorial,
    category: "Craft",
    readTime: "7 min read",
    author: "StyleAI Team",
    publishedAt: "15 August 2026",
    body: [
      "Every product that enters StyleAI is read like a first draft — category, colour, formality, season, occasion.",
      "The system does not replace the buyer's taste. It removes the friction between a beautiful product and the person it was made for.",
      "The output is not a recommendation engine. It is a conversation between the atelier and the wardrobe.",
    ],
    pullQuote: "The best technology is the one you forget is there.",
  },
];



export const editorialBySlug = (slug: string): EditorialStory | undefined =>
  editorialStories.find((s) => s.slug === slug);

export const featuredStory = (): EditorialStory =>
  editorialStories.find((s) => s.featured) ?? editorialStories[0]!;

export const nonFeaturedStories = (): EditorialStory[] =>
  editorialStories.filter((s) => !s.featured);

export const editorialByCategory = (category: EditorialCategory): EditorialStory[] =>
  editorialStories.filter((s) => s.category === category);

export const editorialCategories: EditorialCategory[] = [
  "Styling",
  "Trends",
  "Craft",
  "Interview",
  "Lookbook",
];