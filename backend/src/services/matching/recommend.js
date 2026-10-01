// services/matching/recommend.js
// ======================================================
// Orchestrator: product → AI service → ranked influencers
// Falls back to local heuristic if AI fails.
// Caches AI results for 1 hour per (product + candidates).
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { loadCandidatePool } = require('./filters');
const { scoreInfluencer, DEFAULT_WEIGHTS } = require('./scoring');
const { callMatchApi } = require('./aiClient');
const matchingCache = require('./cache');

// Small batch for CPU inference (16GB DDR3 → ~40-70s per request)
const PRE_FILTER_LIMIT = 30;

// ------------------------------------------------------
// Brief builders
// ------------------------------------------------------
function productToBrief(product) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    description: product.description ? product.description.slice(0, 300) : null,
    price: product.price != null ? Number(product.price) : null,
    currency: product.currency,
    gender: product.gender,
    season: product.season,
    occasion: product.occasion,
    brand_name: product.brand ? product.brand.name : null,
    brand_country: product.brand ? product.brand.country : null,
    brand_city: null,
  };
}

function influencerToBrief(inf) {
  return {
    id: inf.id,
    display_name: inf.displayName,
    username: inf.username,
    categories: inf.categories || [],
    follower_count: inf.followerCount,
    engagement_rate: inf.engagementRate,
    country: inf.country,
    city: inf.city,
    price_per_post: inf.pricePerPost != null ? Number(inf.pricePerPost) : null,
    currency: inf.currency,
    fashion_score: inf.fashionScore,
    luxury_score: inf.luxuryScore,
    beauty_score: inf.beautyScore,
    lifestyle_score: inf.lifestyleScore,
  };
}

// ------------------------------------------------------
// Shape AI result back into full influencer object
// ------------------------------------------------------
function buildInfluencerShape(inf, aiItem, aiPowered) {
  return {
    influencer: {
      id: inf.id,
      displayName: inf.displayName,
      username: inf.username,
      slug: inf.slug,
      avatarUrl: inf.avatarUrl,
      bio: inf.bio,
      categories: inf.categories || [],
      country: inf.country,
      city: inf.city,
      followerCount: inf.followerCount,
      engagementRate: inf.engagementRate,
      pricePerPost: inf.pricePerPost != null ? Number(inf.pricePerPost) : null,
      currency: inf.currency,
      availability: inf.availability,
      profileCompleted: inf.profileCompleted,
    },
    score: aiItem.score,
    breakdown: {
      category: aiItem.category_score,
      niche: aiItem.niche_score,
      engagement: aiItem.engagement_score,
      audience: aiItem.audience_score,
      price: aiItem.price_score,
      location: aiItem.location_score ?? 50,
    },
    reasons: (aiItem.reasons || []).map((text) => ({
      dimension: 'AI',
      text,
      weight: 0,
    })),
    verdict: aiItem.verdict || null,
    aiPowered,
  };
}

// ------------------------------------------------------
// Local heuristic fallback
// ------------------------------------------------------
function heuristicFallback(product, candidates) {
  return candidates
    .map((inf) => {
      const scored = scoreInfluencer(product, inf, DEFAULT_WEIGHTS);
      return buildInfluencerShape(
        inf,
        {
          score: scored.score,
          category_score: scored.breakdown.category,
          niche_score: scored.breakdown.niche,
          engagement_score: scored.breakdown.engagement,
          audience_score: scored.breakdown.audience,
          price_score: scored.breakdown.price,
          location_score: scored.breakdown.location ?? 50,
          reasons: scored.reasons.map((r) => r.text),
          verdict: 'Heuristic score (AI unavailable)',
        },
        false
      );
    })
    .sort((a, b) => b.score - a.score);
}

// ------------------------------------------------------
// MAIN — recommend influencers for a product
// ------------------------------------------------------
async function recommendForProduct(user, productId, options) {
  options = options || {};

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: true, images: true },
  });
  if (!product) throw httpError('Product not found', 404, 'NOT_FOUND');

  // ---- Auth ----
  const isAdmin = user.roles && user.roles.includes('SUPER_ADMIN');
  const isAgency = user.roles && user.roles.includes('AGENCY');
  const isOwner = user.organizationId === product.brand.organizationId;

  if (!isAdmin && !isOwner) {
    if (isAgency) {
      const link = await prisma.agencyClient.findFirst({
        where: {
          agencyOrganizationId: user.organizationId,
          clientOrganizationId: product.brand.organizationId,
          status: { not: 'COMPLETED' },
        },
      });
      if (!link) throw httpError('Forbidden: no access to this brand', 403, 'FORBIDDEN');
    } else {
      throw httpError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  const limit = Math.min(Number(options.limit) || 20, 50);
  const minScore = Number(options.minScore) || 0;

  const productShape = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price != null ? Number(product.price) : null,
    currency: product.currency,
    gender: product.gender,
    occasion: product.occasion,
    primaryImage: product.images && product.images[0] ? product.images[0].url : null,
    brand: { id: product.brand.id, name: product.brand.name },
  };

  // ---- Load candidates ----
  const candidates = await loadCandidatePool({
    excludeInfluencerIds: options.exclude || [],
  });

  if (candidates.length === 0) {
    return {
      product: productShape,
      weights: DEFAULT_WEIGHTS,
      totalCandidates: 0,
      aiPowered: false,
      provider: 'none',
      model: null,
      latencyMs: 0,
      matches: [],
    };
  }

  // ---- Pre-filter top N by heuristic ----
  const preRanked = candidates
    .map((inf) => ({
      inf,
      h: scoreInfluencer(product, inf, DEFAULT_WEIGHTS).score,
    }))
    .sort((a, b) => b.h - a.h)
    .slice(0, PRE_FILTER_LIMIT);

  const candidateIds = preRanked.map((r) => r.inf.id);

  // ---- Cache check FIRST ----
  let aiResult = matchingCache.get(productId, candidateIds);
  let aiPowered = false;

  if (aiResult) {
    aiPowered =
      aiResult.provider === 'ollama' &&
      !aiResult.fallback_used &&
      Array.isArray(aiResult.results) &&
      aiResult.results.length > 0;
  } else {
    // Cache miss → call AI
    try {
      const brief = {
        product: productToBrief(product),
        candidates: preRanked.map((r) => influencerToBrief(r.inf)),
      };
      aiResult = await callMatchApi(brief);
      aiPowered =
        !aiResult.fallback_used &&
        aiResult.provider === 'ollama' &&
        Array.isArray(aiResult.results) &&
        aiResult.results.length > 0;

      // Store in cache ONLY if it was a real AI response
      if (aiPowered) {
        matchingCache.set(productId, candidateIds, aiResult);
      }
    } catch (err) {
      console.error('[matching] AI call failed:', err.message);
      aiResult = null;
    }
  }

  // ---- Build matches ----
  let matches;
  if (aiPowered && aiResult) {
    const byId = new Map(preRanked.map((r) => [r.inf.id, r.inf]));
    matches = aiResult.results
      .map((r) => {
        const inf = byId.get(r.influencer_id);
        return inf ? buildInfluencerShape(inf, r, true) : null;
      })
      .filter(Boolean);
  } else {
    matches = heuristicFallback(
      product,
      preRanked.map((r) => r.inf)
    );
    if (!aiResult) {
      aiResult = {
        provider: 'heuristic-local',
        model: 'rule_based_v1',
        latency_ms: 0,
      };
    }
  }

  const filtered = matches.filter((m) => m.score >= minScore).slice(0, limit);

  return {
    product: productShape,
    weights: DEFAULT_WEIGHTS,
    totalCandidates: candidates.length,
    aiPowered,
    provider: aiResult.provider,
    model: aiResult.model,
    latencyMs: aiResult.latency_ms,
    matches: filtered,
  };
}

// ------------------------------------------------------
// Reverse — products matched to current influencer
// Heuristic only (running N LLM calls per page-load is too slow)
// ------------------------------------------------------
async function recommendProductsForMe(user, options) {
  options = options || {};

  const inf = await prisma.influencer.findUnique({
    where: { userId: user.id },
    include: { audienceMetrics: true, socialAccounts: true },
  });
  if (!inf) throw httpError('No influencer profile linked', 404, 'NOT_INFLUENCER');

  const products = await prisma.product.findMany({
    where: { inventory: { gt: 0 } },
    include: { brand: true, images: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  const limit = Math.min(Number(options.limit) || 30, 100);
  const minScore = Number(options.minScore) || 0;

  const preRanked = products
    .map((p) => ({
      p,
      h: scoreInfluencer(p, inf, DEFAULT_WEIGHTS).score,
    }))
    .sort((a, b) => b.h - a.h)
    .slice(0, 30);

  const matches = preRanked
    .map((r) => {
      const p = r.p;
      const scored = scoreInfluencer(p, inf, DEFAULT_WEIGHTS);
      return {
        product: {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          price: p.price != null ? Number(p.price) : null,
          currency: p.currency,
          gender: p.gender,
          occasion: p.occasion,
          primaryImage: p.images && p.images[0] ? p.images[0].url : null,
          brand: { id: p.brand.id, name: p.brand.name, slug: p.brand.slug },
        },
        score: scored.score,
        breakdown: scored.breakdown,
        reasons: scored.reasons,
        verdict: null,
        aiPowered: false,
      };
    })
    .filter((m) => m.score >= minScore)
    .slice(0, limit);

  return {
    influencer: {
      id: inf.id,
      displayName: inf.displayName,
      username: inf.username,
      slug: inf.slug,
      categories: inf.categories || [],
    },
    weights: DEFAULT_WEIGHTS,
    totalCandidates: products.length,
    aiPowered: false,
    provider: 'heuristic-local',
    model: 'rule_based_v1',
    latencyMs: 0,
    matches,
  };
}

module.exports = { recommendForProduct, recommendProductsForMe };