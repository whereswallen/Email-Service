/**
 * BullMQ worker entry point.
 * Run as: node dist/api/src/jobs/worker.js
 */

import { Worker } from 'bullmq';
import { loadConfig } from '../lib/config';
import { getRedis, closeRedis } from '../lib/redis';
import { closePool } from '../lib/db';
import { registerRepeatableJobs } from './queues';
import { processAuctionCloser } from './processors/auction-closer';
import { processExpiredScanner } from './processors/expired-scanner';
import { processExpiredEvaluator } from './processors/expired-evaluator';
import { processRenewalChecker } from './processors/renewal-checker';
import { processAIBatchValuation } from './processors/ai-batch-valuator';
import { processAIDiscoveryEnrich } from './processors/ai-discovery-enricher';

loadConfig();

const connection = getRedis();

const workers: Worker[] = [];

function createWorkers() {
  workers.push(
    new Worker('auction-closer', processAuctionCloser, {
      connection,
      concurrency: 1,
    }),

    new Worker('expired-scanner', processExpiredScanner, {
      connection,
      concurrency: 1,
    }),

    new Worker('expired-evaluator', processExpiredEvaluator, {
      connection,
      concurrency: 3,
    }),

    new Worker('renewal-checker', processRenewalChecker, {
      connection,
      concurrency: 1,
    }),

    // AI workers (concurrency 1 to control Claude API rate)
    new Worker('ai-batch-valuator', processAIBatchValuation, {
      connection,
      concurrency: 1,
      limiter: { max: 10, duration: 60000 },
    }),

    new Worker('ai-discovery-enricher', processAIDiscoveryEnrich, {
      connection,
      concurrency: 1,
    })
  );

  for (const worker of workers) {
    worker.on('completed', (job) => {
      console.log(`Job ${job.name} completed`);
    });
    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.name} failed:`, err.message);
    });
  }
}

async function start() {
  console.log('Starting workers...');
  await registerRepeatableJobs();
  createWorkers();
  console.log(`${workers.length} workers running`);
}

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  await closePool();
  await closeRedis();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
