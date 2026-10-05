// services/queue/connection.js
// ======================================================
// Shared ioredis connection for BullMQ.
// Lazy init — returns null if disabled or Redis unreachable.
// ======================================================
const IORedis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_ENABLED = String(process.env.QUEUE_ENABLED || 'false').toLowerCase() === 'true';

let connection = null;
let healthy = false;

function getConnection() {
  if (!QUEUE_ENABLED) return null;
  if (connection) return connection;

  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,   // required by BullMQ
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });

  connection.on('ready', () => {
    healthy = true;
    console.log('[queue] Redis connection ready');
  });
  connection.on('error', (err) => {
    if (healthy) console.warn('[queue] Redis error:', err.message);
    healthy = false;
  });
  connection.on('close', () => {
    healthy = false;
  });

  return connection;
}

function isHealthy() {
  return healthy && !!connection;
}

async function closeConnection() {
  if (!connection) return;
  try {
    await connection.quit();
    console.log('[queue] Redis connection closed');
  } catch (e) {
    console.error('[queue] Redis close failed:', e.message);
  } finally {
    connection = null;
    healthy = false;
  }
}

module.exports = {
  getConnection,
  closeConnection,
  isHealthy,
  QUEUE_ENABLED,
};