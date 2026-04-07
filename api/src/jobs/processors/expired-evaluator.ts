/**
 * Expired domain evaluator -- runs SEO + email reputation scoring on discovered candidates.
 */

import { Job } from 'bullmq';
import { ExpiredDomainServiceAPI } from '../../services/expired-domain-service';
import { getPool } from '../../lib/db';

export async function processExpiredEvaluator(job: Job): Promise<void> {
  const service = new ExpiredDomainServiceAPI(getPool());

  // Single domain evaluation
  if (job.data?.domain) {
    const domain = job.data.domain as string;
    console.log(`Evaluating candidate: ${domain}`);
    await service.evaluateCandidate(domain);
    return;
  }

  // Batch evaluation of all discovered candidates
  console.log('Batch evaluating discovered candidates...');
  const evaluated = await service.evaluateAll();
  console.log(`Evaluated ${evaluated} candidates`);
}
