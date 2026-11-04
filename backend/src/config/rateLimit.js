// src/config/rateLimit.js

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const crypto = require('crypto');
const redis = require('./redis');

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

function makeStore(name) {
  return new RedisRateStore({
    client: redis,
    prefix: `rl:${name}:`,
  });
}

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

function shouldSkipRateLimit(req) {
  const p = req.path || '';
  if (p.startsWith('/api/health')) return true;
  if (p.startsWith('/api/notifications/stream')) return true;
  if (p.startsWith('/socket.io')) return true;
  if (p.startsWith('/api/webhooks')) return true;
  return false;
}

const isProd = process.env.NODE_ENV === 'production';

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

const loginEmailLimiter = rateLimit({
  ...makeBaseOpts('login-email'),
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100, // 🆕 relaxed in dev
  skipSuccessfulRequests: true,
  keyGenerator: (req) => emailKey('login:email', req),
  message: {
    message:
      'Too many failed attempts for this account. Try again in 15 minutes.',
    code: 'LOGIN_EMAIL_RATE_LIMIT',
  },
});

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

const passwordResetLimiter = rateLimit({
  ...makeBaseOpts('pwreset'),
  windowMs: 60 * 60 * 1000,
  max: isProd ? 3 : 20, // 🆕 relaxed in dev
  keyGenerator: (req) => emailKey('pwreset', req),
  message: {
    message: 'Too many password reset requests. Try again later.',
    code: 'PWRESET_RATE_LIMIT',
  },
});

// 🆕 prod: 3/hr, dev: 20/hr
const verifyEmailLimiter = rateLimit({
  ...makeBaseOpts('verify-email'),
  windowMs: 60 * 60 * 1000,
  max: isProd ? 3 : 20,
  keyGenerator: (req) => emailKey('verify-email', req),
  message: {
    message: 'Too many verification email requests. Try again later.',
    code: 'VERIFY_EMAIL_RATE_LIMIT',
  },
});

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
  verifyEmailLimiter,
  heavyLimiter,
};