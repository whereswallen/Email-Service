/**
 * BullMQ queue definitions and repeatable job schedules.
 */

import { Queue } from 'bullmq';
import { getRedis } from '../lib/redis';

let _queues: Record<string, Queue> | null = null;

export function getQueues() {
  if (_queues) return _queues;

  const connection = getRedis();

  _queues = {
    auctionCloser: new Queue('auction-closer', { connection }),
    expiredScanner: new Queue('expired-scanner', { connection }),
    expiredEvaluator: new Queue('expired-evaluator', { connection }),
    renewalChecker: new Queue('renewal-checker', { connection }),
    invoiceGenerator: new Queue('invoice-generator', { connection }),
  };

  return _queues;
}

/**
 * Register repeatable (cron-style) jobs. Call once on worker startup.
 */
export async function registerRepeatableJobs(): Promise<void> {
  const queues = getQueues();

  // Close expired auctions every minute
  await queues.auctionCloser.upsertJobScheduler(
    'close-expired',
    { every: 60000 },
    { name: 'close-expired-auctions' }
  );

  // Scan for new expired domain candidates every 6 hours
  await queues.expiredScanner.upsertJobScheduler(
    'scan-expired',
    { every: 6 * 60 * 60 * 1000 },
    { name: 'scan-expired-domains' }
  );

  // Check domain renewals daily at 9am UTC
  await queues.renewalChecker.upsertJobScheduler(
    'check-renewals',
    { pattern: '0 9 * * *' },
    { name: 'check-domain-renewals' }
  );

  // Generate invoices on the 1st of each month
  await queues.invoiceGenerator.upsertJobScheduler(
    'monthly-invoices',
    { pattern: '0 0 1 * *' },
    { name: 'generate-monthly-invoices' }
  );

  console.log('Repeatable jobs registered');
}
