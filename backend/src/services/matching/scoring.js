// services/matching/scoring.js
// ======================================================
// Explainable scoring functions for product → influencer matching
// Every score returns { value: 0-100, reasons: [] }
// ======================================================

// ------------------------------------------------------
// Normalize category strings for comparison
// ------------------------------------------------------
function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// ------------------------------------------------------
// 1. CATEGORY MATCH (weight: 40)
// Product category vs influencer categories
// ------------------------------------------------------
function scoreCategoryMatch(product, influencer) {
  const pc = norm(product.category);
  if (!pc) return { value: 40, reasons: ["No product category set — default weight"] };

  const infCats = (influencer.categories || []).map(norm);
  if (infCats.length === 0) {
    return { value: 20, reasons: ["Influencer has no categories listed"] };
  }

  // Exact match
  if (infCats.includes(pc)) {
    return { value: 100, reasons: [`Exact match on "${product.category}"`] };
  }

  // Partial match (either contains the other)
  const partial = infCats.find((c) => c.includes(pc) || pc.includes(c));
  if (partial) {
    return {
      value: 75,
      reasons: [`Related category — "${product.category}" ↔ "${partial}"`],
    };
  }

  // Fashion/beauty family heuristic
  const related = {
    clothing: ["fashion", "clothing", "lifestyle", "streetwear", "style"],
    footwear: ["fashion", "clothing", "lifestyle", "streetwear"],
    accessories: ["fashion", "lifestyle", "accessories", "bags", "jewelry"],
    bags: ["fashion", "accessories", "bags"],
    beauty: ["beauty", "skincare", "makeup", "cosmetics"],
    food: ["food", "cooking", "lifestyle"],
    fitness: ["fitness", "health", "sports", "wellness"],
    tech: ["tech", "gadgets", "software", "business"],
  };
  const family = related[pc];
  if (family) {
    const hit = infCats.find((c) => family.includes(c));
    if (hit) {
      return {
        value: 55,
        reasons: [`Adjacent category — "${product.category}" ↔ "${hit}"`],
      };
    }
  }

  return { value: 10, reasons: [`No overlap with ${product.category}`] };
}

// ------------------------------------------------------
// 2. NICHE SCORE MATCH (weight: 25)
// Match product's luxury/style signals with influencer's AI scores
// ------------------------------------------------------
function scoreNicheMatch(product, influencer) {
  const reasons = [];
  const price = Number(product.price || 0);

  // Determine product positioning from price + occasion + season
  const isLuxury =
    price >= 500 ||
    ["luxury", "premium"].some((k) => norm(product.occasion).includes(k));
  const isFashion = ["clothing", "footwear", "accessories", "bags"].includes(norm(product.category));
  const isBeauty = norm(product.category) === "beauty";

  const fashion = Number(influencer.fashionScore ?? 0) * 100;
  const luxury = Number(influencer.luxuryScore ?? 0) * 100;
  const beauty = Number(influencer.beautyScore ?? 0) * 100;
  const lifestyle = Number(influencer.lifestyleScore ?? 0) * 100;

  const hasAnyScore = [fashion, luxury, beauty, lifestyle].some((s) => s > 0);
  if (!hasAnyScore) {
    return { value: 50, reasons: ["No niche scores computed yet for this creator"] };
  }

  let score = 50;
  const parts = [];

  if (isFashion && fashion > 0) {
    score = Math.max(score, fashion);
    parts.push(`Fashion ${fashion.toFixed(0)}`);
  }
  if (isLuxury && luxury > 0) {
    score = Math.max(score, luxury);
    parts.push(`Luxury ${luxury.toFixed(0)}`);
  }
  if (isBeauty && beauty > 0) {
    score = Math.max(score, beauty);
    parts.push(`Beauty ${beauty.toFixed(0)}`);
  }
  if (lifestyle > 0) {
    score = Math.max(score, lifestyle * 0.9); // lifestyle is softer
    parts.push(`Lifestyle ${lifestyle.toFixed(0)}`);
  }

  if (isLuxury && luxury >= 70) {
    reasons.push("Strong luxury alignment");
  } else if (isLuxury && luxury < 40) {
    score -= 15;
    reasons.push("Positioning mismatch — creator skews mass-market");
  }

  reasons.push(`Niche: ${parts.join(" · ")}`);
  return { value: Math.max(0, Math.min(100, score)), reasons };
}

// ------------------------------------------------------
// 3. ENGAGEMENT (weight: 15)
// ------------------------------------------------------
function scoreEngagement(influencer) {
  const er = Number(influencer.engagementRate || 0);
  if (er <= 0) return { value: 30, reasons: ["No engagement data"] };

  // Industry benchmarks:
  // <2% = below average, 2-4% = good, >4% = excellent
  let score = 0;
  if (er >= 0.06) score = 100; // 6%+
  else if (er >= 0.04) score = 85;
  else if (er >= 0.03) score = 70;
  else if (er >= 0.02) score = 55;
  else if (er >= 0.01) score = 40;
  else score = 20;

  return {
    value: score,
    reasons: [`Engagement ${(er * 100).toFixed(2)}% ${score >= 70 ? "· excellent" : score >= 55 ? "· solid" : ""}`],
  };
}

// ------------------------------------------------------
// 4. AUDIENCE MATCH (weight: 10)
// Product gender + age vs influencer audience composition
// ------------------------------------------------------
function scoreAudienceMatch(product, influencer) {
  const reasons = [];
  const metrics = influencer.audienceMetrics;
  if (!metrics || (!metrics.genderDistribution && !metrics.ageDistribution)) {
    return { value: 50, reasons: ["No audience breakdown available"] };
  }

  let score = 50;

  // Gender alignment
  const productGender = norm(product.gender);
  const genderDist = metrics.genderDistribution || {};
  if (productGender === "female" || productGender === "women") {
    const f = Number(genderDist.female ?? genderDist.women ?? 0);
    if (f > 0) {
      score = f >= 70 ? 90 : f >= 55 ? 75 : f >= 40 ? 55 : 35;
      reasons.push(`${f}% female audience`);
    }
  } else if (productGender === "male" || productGender === "men") {
    const m = Number(genderDist.male ?? genderDist.men ?? 0);
    if (m > 0) {
      score = m >= 70 ? 90 : m >= 55 ? 75 : m >= 40 ? 55 : 35;
      reasons.push(`${m}% male audience`);
    }
  }

  return { value: Math.max(0, Math.min(100, score)), reasons: reasons.length ? reasons : ["Audience is neutral"] };
}

// ------------------------------------------------------
// 5. PRICE ALIGNMENT (weight: 10)
// Influencer's starting rate vs product price bracket
// ------------------------------------------------------
function scorePriceAlignment(product, influencer) {
  const productPrice = Number(product.price || 0);
  const infPrice = Number(influencer.pricePerPost || 0);

  if (!productPrice || !infPrice) {
    return { value: 50, reasons: ["Missing price data"] };
  }

  const ratio = infPrice / productPrice;

  // Ideal: influencer rate is 0.5× to 3× product price
  if (ratio >= 0.5 && ratio <= 3) {
    return { value: 85, reasons: ["Influencer rate aligns with product price bracket"] };
  }
  if (ratio <= 5) {
    return { value: 65, reasons: ["Rate is on the higher end for this product"] };
  }
  if (ratio <= 10) {
    return { value: 45, reasons: ["Rate may exceed product margin"] };
  }
  return { value: 25, reasons: ["Rate far exceeds product price"] };
}

// ------------------------------------------------------
// Master scorer — runs all, computes weighted total
// ------------------------------------------------------
const DEFAULT_WEIGHTS = {
  category: 40,
  niche: 25,
  engagement: 15,
  audience: 10,
  price: 10,
};

function scoreInfluencer(product, influencer, weights = DEFAULT_WEIGHTS) {
  const category = scoreCategoryMatch(product, influencer);
  const niche = scoreNicheMatch(product, influencer);
  const engagement = scoreEngagement(influencer);
  const audience = scoreAudienceMatch(product, influencer);
  const price = scorePriceAlignment(product, influencer);

  const total =
    (category.value * weights.category +
      niche.value * weights.niche +
      engagement.value * weights.engagement +
      audience.value * weights.audience +
      price.value * weights.price) /
    100;

  // Collect all reasons, tag which bucket they came from
  const reasons = [
    ...category.reasons.map((r) => ({ dimension: "Category", text: r, weight: weights.category })),
    ...niche.reasons.map((r) => ({ dimension: "Niche", text: r, weight: weights.niche })),
    ...engagement.reasons.map((r) => ({ dimension: "Engagement", text: r, weight: weights.engagement })),
    ...audience.reasons.map((r) => ({ dimension: "Audience", text: r, weight: weights.audience })),
    ...price.reasons.map((r) => ({ dimension: "Price", text: r, weight: weights.price })),
  ];

  return {
    score: Math.round(total * 10) / 10, // 1 decimal
    breakdown: {
      category: Math.round(category.value),
      niche: Math.round(niche.value),
      engagement: Math.round(engagement.value),
      audience: Math.round(audience.value),
      price: Math.round(price.value),
    },
    reasons,
  };
}

module.exports = {
  scoreInfluencer,
  scoreCategoryMatch,
  scoreNicheMatch,
  scoreEngagement,
  scoreAudienceMatch,
  scorePriceAlignment,
  DEFAULT_WEIGHTS,
};