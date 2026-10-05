// services/queue/workers.js
// ======================================================
// Register BullMQ workers.
// Start: after queues initialized.
// Stop: during graceful shutdown.
// ======================================================
const { Worker } = require('bullmq');
const { getConnection, QUEUE_ENABLED } = require('./connection');
const { processWebhookRetry } = require('./jobs/webhookRetry');
const { processEmailSend } = require('./jobs/emailSend');
const { processAITask } = require('./jobs/aiGeneration');

const PREFIX = process.env.QUEUE_PREFIX || 'styleai';

let workers = [];

function startWorkers() {
  if (!QUEUE_ENABLED) {
    console.log('[queue] QUEUE_ENABLED=false — workers disabled');
    return;
  }
  const connection = getConnection();
  if (!connection) return;

  const webhookWorker = new Worker('webhook', processWebhookRetry, {
    connection,
    prefix: PREFIX,
    concurrency: 5,
  });
  const emailWorker = new Worker('email', processEmailSend, {
    connection,
    prefix: PREFIX,
    concurrency: 10,
  });
  const aiWorker = new Worker('ai', processAITask, {
    connection,
    prefix: PREFIX,
    concurrency: 2,
  });

  [webhookWorker, emailWorker, aiWorker].forEach((w) => {
    w.on('completed', (job) => {
      console.log(`[queue:${w.name}] ✅ job ${job.id} completed`);
    });
    w.on('failed', (job, err) => {
      console.error(`[queue:${w.name}] ❌ job ${job?.id} failed:`, err.message);
    });
    w.on('error', (err) => {
      console.error(`[queue:${w.name}] worker error:`, err.message);
    });
  });

  workers = [webhookWorker, emailWorker, aiWorker];
  console.log('[queue] Workers started: webhook, email, ai');
}

async function stopWorkers() {
  const closes = workers.map((w) => w.close().catch(() => {}));
  await Promise.all(closes);
  workers = [];
  console.log('[queue] All workers stopped');
}

module.exports = { startWorkers, stopWorkers };