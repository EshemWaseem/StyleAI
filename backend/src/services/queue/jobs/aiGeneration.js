// services/queue/jobs/aiGeneration.js
// ======================================================
// Async AI task runner — placeholder for future heavy jobs
// (photo generation, batch content, video).
// Currently: no-op unless task type implemented.
// ======================================================

async function processAITask(job) {
  const { taskType } = job.data;
  console.log(`[queue.ai] task=${taskType} attempt=${job.attemptsMade + 1}`);

  switch (taskType) {
    // Future:
    // case 'photography':
    //   return require('./ai/photography').run(job.data);
    default:
      console.warn(`[queue.ai] unknown task: ${taskType}`);
      return null;
  }
}

module.exports = { processAITask };