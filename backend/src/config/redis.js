// src/config/redis.js
// ======================================================
// Reuses the SAME Redis connection as the queue service.
// No duplicate connections. If queue is disabled, falls
// back to a lazy ioredis connection.
// ======================================================
const Redis = require('ioredis');

let redis;

try {
  const { getConnection, QUEUE_ENABLED } = require('../services/queue');
  if (QUEUE_ENABLED) {
    redis = getConnection();
    if (redis) {
      console.log('[rate-limit-redis] reusing queue connection');
    }
  }
} catch (e) {
  // queue service not available — fall through
}

if (!redis) {
  const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  redis.on('error', (e) => console.error('[rate-limit-redis] error:', e.message));
  redis.on('connect', () => console.log('[rate-limit-redis] connected'));
  console.log('[rate-limit-redis] created dedicated connection');
}

module.exports = redis;