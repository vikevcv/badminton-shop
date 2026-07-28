import 'dotenv/config';

import { Worker } from 'bullmq';
import redis from '../config/redis.js';
import { processUpload, processUploadFailed } from '../services/upload.service.js';

const CONCURRENCY = parseInt(process.env.UPLOAD_CONCURRENCY, 10) || 5;

const REQUIRED_FIELDS = ['table', 'id', 'localPath', 'type'];

const worker = new Worker(
  'upload',
  async (job) => {
    console.log(`🔄 Upload job ${job.id} started for ${job.data.table}:${job.data.id}`);

    for (const field of REQUIRED_FIELDS) {
      if (job.data[field] === undefined || job.data[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    await processUpload(job.data);

    return { success: true };
  },
  {
    connection: redis,
    concurrency: CONCURRENCY,
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Upload job ${job.id} completed: ${job.data.table}:${job.data.id}`);
});

worker.on('failed', async (job, err) => {
  console.error(`❌ Upload job ${job.id} failed: ${job.data.table}:${job.data.id} — ${err.message}`);

  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    console.error(`💀 Upload job ${job.id} permanently failed after ${job.attemptsMade} attempts`);
    await processUploadFailed(job.data);
  }
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err.message);
});

console.log(`🚀 Upload worker started (concurrency: ${CONCURRENCY})`);

const gracefulShutdown = async () => {
  console.log('🔄 Shutting down upload worker...');
  await worker.close();
  console.log('👋 Upload worker stopped');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
