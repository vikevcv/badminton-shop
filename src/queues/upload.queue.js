import { Queue } from 'bullmq';
import redis from '../config/redis.js';

const MAX_RETRY = parseInt(process.env.UPLOAD_MAX_RETRY, 10) || 3;
const BACKOFF_DELAY = parseInt(process.env.UPLOAD_BACKOFF_DELAY, 10) || 2000;

export const uploadQueue = new Queue('upload', {
  connection: redis,
  defaultJobOptions: {
    attempts: MAX_RETRY,
    backoff: {
      type: 'exponential',
      delay: BACKOFF_DELAY,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

export const addUploadJob = async (data) => {
  const job = await uploadQueue.add('upload', data);
  console.log(`📤 Upload job ${job.id} created for ${data.table}:${data.id}`);
  return job;
};

export const getJob = async (jobId) => {
  return await uploadQueue.getJob(jobId);
};

export const retryJob = async (jobId) => {
  const job = await uploadQueue.getJob(jobId);
  if (job) {
    await job.retry();
  }
  return job;
};

export const removeJob = async (jobId) => {
  const job = await uploadQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
  return job;
};
