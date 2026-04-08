/**
 * Background job: bulk AI valuation for portfolio domains or expired candidates.
 * Processes a batch of domains through the AI valuation pipeline.
 */

import { Job } from 'bullmq';
import { getPool } from '../../lib/db';
import { getRedis } from '../../lib/redis';
import { AIServiceAPI } from '../../services/ai-service';

export interface AIBatchValuationData {
  customerId: string;
  domains: { domain: string; tld: string; domainAuthority?: number; backlinks?: number }[];
}

export async function processAIBatchValuation(job: Job<AIBatchValuationData>): Promise<void> {
  const { customerId, domains } = job.data;
  const ai = new AIServiceAPI(getPool(), getRedis());

  let completed = 0;
  for (const d of domains) {
    try {
      await ai.getValuation(customerId, d);
      completed++;
      await job.updateProgress(Math.round((completed / domains.length) * 100));
    } catch (err) {
      job.log(`Failed to valuate ${d.domain}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  job.log(`Completed ${completed}/${domains.length} AI valuations`);
}
