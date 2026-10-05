// services/queue/index.js
const { getConnection, closeConnection, isHealthy, QUEUE_ENABLED } = require('./connection');
const {
  initQueues,
  getQueue,
  closeQueues,
  enqueueWebhookRetry,
  enqueueEmail,
  enqueueAI,
} = require('./queues');
const { startWorkers, stopWorkers } = require('./workers');

module.exports = {
  QUEUE_ENABLED,
  getConnection,
  closeConnection,
  isHealthy,

  initQueues,
  getQueue,
  closeQueues,

  startWorkers,
  stopWorkers,

  enqueueWebhookRetry,
  enqueueEmail,
  enqueueAI,
};