// services/queue/queues.js
// ======================================================
// BullMQ queue definitions.
// All queues share the same Redis connection + prefix.
// ======================================================
const { Queue } = require('bullmq');
const { getConnection, QUEUE_ENABLED } = require('./connection');

const PREFIX = process.env.QUEUE_PREFIX || 'styleai';

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 30_000, // 30s → 60s → 2m → 4m → 8m
  },
  removeOnComplete: {
    age: 24 * 3600, // keep 24h
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // keep 7 days
    count: 5000,
  },
};

let queues = {};

function initQueues() {
  if (!QUEUE_ENABLED) {
    console.log('[queue] QUEUE_ENABLED=false — queues disabled');
    return null;
  }
  const connection = getConnection();
  if (!connection) return null;

  queues.webhook = new Queue('webhook', {
    connection,
    prefix: PREFIX,
    defaultJobOptions,
  });

  queues.email = new Queue('email', {
    connection,
    prefix: PREFIX,
    defaultJobOptions,
  });

  queues.ai = new Queue('ai', {
    connection,
    prefix: PREFIX,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2, // AI jobs expensive, fewer retries
    },
  });

  console.log('[queue] Queues initialized: webhook, email, ai');
  return queues;
}

function getQueue(name) {
  return queues[name] || null;
}

async function closeQueues() {
  const closes = Object.values(queues).map((q) => q.close().catch(() => {}));
  await Promise.all(closes);
  queues = {};
  console.log('[queue] All queues closed');
}

// Convenience enqueue helpers
async function enqueueWebhookRetry(data) {
  if (!queues.webhook) return null;
  return queues.webhook.add('retry-webhook', data, { jobId: data.eventId });
}

async function enqueueEmail(data) {
  if (!queues.email) return null;
  return queues.email.add('send-email', data);
}

async function enqueueAI(data) {
  if (!queues.ai) return null;
  return queues.ai.add('ai-task', data);
}

module.exports = {
  initQueues,
  getQueue,
  closeQueues,
  enqueueWebhookRetry,
  enqueueEmail,
  enqueueAI,
};