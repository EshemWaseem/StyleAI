// backend/src/middleware/trialGate.js
//      ==
// GLOBAL TRIAL ENFORCEMENT (Layer 1 — Authoritative)
//       
// Runs before every /api/* route (except allowed paths).
// Blocks trial-expired / inactive subscriptions with 402.
//
// This is THE source of truth. Frontend is reactive only.
//      ==

const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const svc = require('../services/billing');
const { computeEffectiveState } = require('../services/billing/helpers');

// Paths that MUST work even with expired trial
// (user needs to reach billing, view plans, log out, etc.)
const ALLOWED_PREFIXES = [
  '/api/auth',
  '/api/billing',
  '/api/payments',
  '/api/webhooks',
  '/api/health',
  '/api/catalog',
  '/api/products/public',
  '/api/notifications', // allow viewing notifications (non-blocking)
];

// Short-lived cache so we don't hit DB on every request
const CACHE = new Map(); // userId → { blocked, payload?, expiresAt }
const CACHE_TTL_MS = 30_000;

function isAllowed(url) {
  return ALLOWED_PREFIXES.some((p) => url.startsWith(p));
}

function getCached(userId) {
  const hit = CACHE.get(userId);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    CACHE.delete(userId);
    return null;
  }
  return hit;
}

function setCached(userId, entry) {
  CACHE.set(userId, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS });
}

//       
// Public helper — call after user upgrades / changes plan
//       
function clearTrialCache(userId) {
  if (userId) CACHE.delete(userId);
  else CACHE.clear();
}

//       
// Middleware
//       
async function trialGate(req, res, next) {
  try {
    const url = req.originalUrl || req.url || '';

    // Not an API route
    if (!url.startsWith('/api')) return next();

    // Allowed path — skip enforcement
    if (isAllowed(url)) return next();

    // No bearer token → let `authenticate` handle 401
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();

    let decoded;
    try {
      decoded = verifyToken(header.slice(7));
    } catch {
      return next(); // invalid token → authenticate handles it
    }

    const userId = decoded?.userId;
    if (!userId) return next();

    // Cache hit?
    const cached = getCached(userId);
    if (cached) {
      if (cached.blocked) return res.status(402).json(cached.payload);
      return next();
    }

    // Fetch user + roles (minimal select)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
    });

    if (!user) return next();

    const roles = user.userRoles.map((ur) => ur.role.name);

    // Admin bypass
    if (roles.includes('SUPER_ADMIN')) {
      setCached(userId, { blocked: false });
      return next();
    }

    // Pure shopper bypass
    if (roles.includes('SHOPPER') && roles.every((r) => r === 'SHOPPER')) {
      setCached(userId, { blocked: false });
      return next();
    }

    // Fetch subscription (brand/agency → org; influencer → user)
    const { subscription } = await svc.getSubscriptionForUser({
      id: user.id,
      organizationId: user.organizationId,
      roles,
    });

    const state = computeEffectiveState(subscription);
    const blocked =
      state === 'trial_expired' ||
      state === 'past_due' ||
      state === 'expired';

    if (blocked) {
      const payload = {
        code: state === 'trial_expired' ? 'TRIAL_EXPIRED' : 'SUBSCRIPTION_INACTIVE',
        state,
        message:
          state === 'trial_expired'
            ? 'Your free trial has ended. Please choose a plan to continue.'
            : 'Your subscription is inactive. Please update billing to continue.',
        upgradeUrl: '/trial-expired',
      };
      setCached(userId, { blocked: true, payload });
      return res.status(402).json(payload);
    }

    setCached(userId, { blocked: false });
    return next();
  } catch (err) {
    // Never crash the request on billing errors — fail open
    console.error('[trialGate] error:', err?.message);
    return next();
  }
}

module.exports = { trialGate, clearTrialCache };