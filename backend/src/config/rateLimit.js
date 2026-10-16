// src/config/rateLimit.js
// ======================================================
// Centralized rate limiting
// - Redis-backed (multi-instance safe)
// - Each limiter gets its OWN store instance (v8 requirement)
// - Per-user, per-email, per-IP strategies
// - skipSuccessfulRequests for login
// - Structured logging on block
// ======================================================
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const crypto = require('crypto');
const redis = require('./redis');

// ------------------------------------------------------
// Custom Redis store (express-rate-limit v8 compatible)
// ------------------------------------------------------
class RedisRateStore {
  constructor({ client, prefix = 'rl:' }) {
    this.client = client;
    this.prefix = prefix;
    this.localKeys = false;
    this.windowMs = 60_000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  _k(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    const k = this._k(key);
    const multi = this.client.multi();
    multi.incr(k);
    multi.pttl(k);
    const results = await multi.exec();
    const totalHits = results[0][1];
    let ttlMs = results[1][1];

    if (ttlMs < 0) {
      await this.client.pexpire(k, this.windowMs);
      ttlMs = this.windowMs;
    }

    return {
      totalHits,
      resetTime: new Date(Date.now() + ttlMs),
    };
  }

  async decrement(key) {
    try {
      await this.client.decr(this._k(key));
    } catch (e) {
      /* ignore */
    }
  }

  async resetKey(key) {
    try {
      await this.client.del(this._k(key));
    } catch (e) {
      /* ignore */
    }
  }

  async resetAll() {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      if (keys.length) await this.client.del(keys);
    } catch (e) {
      /* ignore */
    }
  }
}

// ✅ v8 requirement — fresh store instance per limiter (unique prefix)
function makeStore(name) {
  return new RedisRateStore({
    client: redis,
    prefix: `rl:${name}:`,
  });
}

// ------------------------------------------------------
// Base options factory (each limiter calls this)
// ------------------------------------------------------
function makeBaseOpts(storeName) {
  return {
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(storeName),
    validate: { xForwardedForHeader: false },
    handler: (req, res, next, options) => {
      console.warn(
        `[rate-limit] BLOCK ${req.method} ${req.originalUrl} ` +
          `key=${req.rateLimit?.key || '-'} ip=${req.ip}`
      );
      res.status(options.statusCode).json(options.message);
    },
  };
}

// ------------------------------------------------------
// Key helpers
// ------------------------------------------------------
function tokenHash(authHeader) {
  return crypto
    .createHash('sha256')
    .update(authHeader)
    .digest('hex')
    .slice(0, 24);
}

function userKey(req) {
  if (req.user?.id) return `u:${req.user.id}`;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return `t:${tokenHash(auth)}`;
  return `ip:${ipKeyGenerator(req.ip)}`;
}

function emailKey(prefix, req) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email) return `${prefix}:${email}`;
  return `${prefix}:anon:${ipKeyGenerator(req.ip)}`;
}

// ------------------------------------------------------
// Skip paths
// ------------------------------------------------------
function shouldSkipRateLimit(req) {
  const p = req.path || '';
  if (p.startsWith('/api/health')) return true;
  if (p.startsWith('/api/notifications/stream')) return true;
  if (p.startsWith('/socket.io')) return true;
  if (p.startsWith('/api/webhooks')) return true;
  return false;
}

const isProd = process.env.NODE_ENV === 'production';

// ------------------------------------------------------
// Limiters
// ------------------------------------------------------

// Global — per user (auth) / per IP (anon)
const globalLimiter = rateLimit({
  ...makeBaseOpts('global'),
  windowMs: 15 * 60 * 1000,
  max: isProd ? 3000 : 10000,
  keyGenerator: userKey,
  skip: shouldSkipRateLimit,
  message: {
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  },
});

// Auth umbrella — covers every /api/auth/* route (loose)
const authUmbrellaLimiter = rateLimit({
  ...makeBaseOpts('auth'),
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 3000,
  keyGenerator: (req) => `auth:ip:${ipKeyGenerator(req.ip)}`,
  message: {
    message: 'Too many auth requests, please slow down.',
    code: 'AUTH_RATE_LIMIT',
  },
});

// Login — per IP (ignores successful logins so office WiFi works)
const loginIpLimiter = rateLimit({
  ...makeBaseOpts('login-ip'),
  windowMs: 15 * 60 * 1000,
  max: isProd ? 50 : 500,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:ip:${ipKeyGenerator(req.ip)}`,
  message: {
    message: 'Too many login attempts from this network. Try again later.',
    code: 'LOGIN_IP_RATE_LIMIT',
  },
});

// Login — per email
// max: 10 so DB lockout (5) triggers FIRST → user sees 423 ACCOUNT_LOCKED
// with proper countdown. This limiter only fires for extreme abuse (bot).
const loginEmailLimiter = rateLimit({
  ...makeBaseOpts('login-email'),
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => emailKey('login:email', req),
  message: {
    message:
      'Too many failed attempts for this account. Try again in 15 minutes.',
    code: 'LOGIN_EMAIL_RATE_LIMIT',
  },
});

// Register — per IP (anti-spam accounts)
const registerLimiter = rateLimit({
  ...makeBaseOpts('register'),
  windowMs: 60 * 60 * 1000,
  max: isProd ? 5 : 50,
  keyGenerator: (req) => `register:ip:${ipKeyGenerator(req.ip)}`,
  message: {
    message: 'Too many accounts created from this network. Try again later.',
    code: 'REGISTER_RATE_LIMIT',
  },
});

// Password reset — per email (very strict)
const passwordResetLimiter = rateLimit({
  ...makeBaseOpts('pwreset'),
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => emailKey('pwreset', req),
  message: {
    message: 'Too many password reset requests. Try again later.',
    code: 'PWRESET_RATE_LIMIT',
  },
});

// Heavy operations — uploads, AI, exports
const heavyLimiter = rateLimit({
  ...makeBaseOpts('heavy'),
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: userKey,
  message: {
    message: 'Too many heavy operations. Please slow down.',
    code: 'HEAVY_RATE_LIMIT',
  },
});

module.exports = {
  RedisRateStore,
  makeStore,
  makeBaseOpts,
  ipKeyGenerator,
  globalLimiter,
  authUmbrellaLimiter,
  loginIpLimiter,
  loginEmailLimiter,
  registerLimiter,
  passwordResetLimiter,
  heavyLimiter,
};