// src/config/redis.js
// ======================================================
// Reuses the SAME Redis connection as the queue service.
// Falls back to a dedicated connection if queue is disabled
// or the shared connection is invalid.
// ======================================================
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis = null;
let source = 'unknown';

// ------------------------------------------------------
// 1. Try reusing the queue connection
// ------------------------------------------------------
try {
  const queue = require('../services/queue');
  const { QUEUE_ENABLED, getConnection } = queue || {};

  if (QUEUE_ENABLED && typeof getConnection === 'function') {
    const conn = getConnection();

    const isValid =
      conn &&
      typeof conn.incr === 'function' &&
      typeof conn.multi === 'function' &&
      typeof conn.pttl === 'function' &&
      typeof conn.pexpire === 'function';

    if (isValid) {
      redis = conn;
      source = 'queue';
      console.log('[rate-limit-redis] reusing queue connection');
    } else {
      console.warn(
        '[rate-limit-redis] queue returned an invalid connection — using dedicated'
      );
    }
  }
} catch (err) {
  console.warn(
    '[rate-limit-redis] queue not available — using dedicated:',
    err.message
  );
}

// ------------------------------------------------------
// 2. Fallback — dedicated connection
// ------------------------------------------------------
if (!redis) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    retryStrategy(times) {
      // Backoff up to 3s between reconnect attempts
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
  });

  source = 'dedicated';

  redis.on('error', (e) =>
    console.error('[rate-limit-redis] error:', e.message)
  );
  redis.on('connect', () => console.log('[rate-limit-redis] connected'));
  redis.on('ready', () => console.log('[rate-limit-redis] ready'));
  redis.on('reconnecting', (ms) =>
    console.warn(`[rate-limit-redis] reconnecting in ${ms}ms`)
  );
  redis.on('end', () => console.warn('[rate-limit-redis] connection ended'));

  console.log('[rate-limit-redis] created dedicated connection');
}

// ------------------------------------------------------
// 3. Metadata for debugging
// ------------------------------------------------------
redis.__source = source;
redis.__isDedicated = source === 'dedicated';

module.exports = redis;