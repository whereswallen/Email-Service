/**
 * Background job: enrich top expired domain candidates with AI analysis.
 * Runs after the heuristic evaluator scores candidates.
 */

import { Job } from 'bullmq';
import { getPool } from '../../lib/db';
import { getRedis } from '../../lib/redis';
import { AIServiceAPI } from '../../services/ai-service';
import { ExpiredCandidateRepository } from '../../repositories/expired-candidate-repository';

export interface AIDiscoveryEnrichData {
  customerId: string;
  limit?: number;
}

export async function processAIDiscoveryEnrich(job: Job<AIDiscoveryEnrichData>): Promise<void> {
  const { customerId, limit = 50 } = job.data;
  const pool = getPool();
  const redis = getRedis();
  const ai = new AIServiceAPI(pool, redis);
  const candidateRepo = new ExpiredCandidateRepository(pool);

  const candidates = await candidateRepo.findTopCandidates(limit);
  if (candidates.length === 0) {
    job.log('No candidates to enrich');
    return;
  }

  job.log(`Enriching ${candidates.length} candidates with AI analysis`);

  const result = await ai.getDiscoveryRecommendations(
    customerId,
    candidates as any,
    {}
  );

  job.log(`AI ranked ${result.recommendations.length} candidates`);
}
