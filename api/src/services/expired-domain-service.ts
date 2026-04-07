/**
 * Expired domain service -- wraps SDK evaluation with DB persistence.
 */

import { Pool } from 'pg';
import { ExpiredCandidateRepository, ExpiredCandidateRow } from '../repositories/expired-candidate-repository';
import { evaluateDomain } from '../../../sdk/expired-domains/evaluator';
import { checkEmailReputation } from '../../../sdk/expired-domains/reputation-check';
import { NotFoundError } from '../lib/errors';

export class ExpiredDomainServiceAPI {
  private repo: ExpiredCandidateRepository;

  constructor(pool: Pool) {
    this.repo = new ExpiredCandidateRepository(pool);
  }

  async addCandidate(data: Partial<ExpiredCandidateRow>): Promise<ExpiredCandidateRow> {
    return this.repo.upsert(data);
  }

  async addCandidates(candidates: Partial<ExpiredCandidateRow>[]): Promise<number> {
    let count = 0;
    for (const candidate of candidates) {
      await this.repo.upsert(candidate);
      count++;
    }
    return count;
  }

  async getCandidate(domain: string): Promise<ExpiredCandidateRow> {
    const candidate = await this.repo.findByDomain(domain);
    if (!candidate) throw new NotFoundError('Expired domain candidate', domain);
    return candidate;
  }

  async getCandidatesByStatus(status: string): Promise<ExpiredCandidateRow[]> {
    return this.repo.findByStatus(status);
  }

  async getTopCandidates(limit: number = 20): Promise<ExpiredCandidateRow[]> {
    return this.repo.findTopCandidates(limit);
  }

  async getMailcowCandidates(): Promise<ExpiredCandidateRow[]> {
    return this.repo.findMailcowCandidates();
  }

  /**
   * Evaluate a single candidate: run SEO scoring + email reputation check, persist results.
   */
  async evaluateCandidate(domain: string): Promise<ExpiredCandidateRow> {
    const candidate = await this.repo.findByDomain(domain);
    if (!candidate) throw new NotFoundError('Expired domain candidate', domain);

    // Run SDK evaluator
    const evaluation = evaluateDomain({
      domain: candidate.domain,
      tld: candidate.tld,
      domainAgeYears: candidate.domainAgeYears ?? undefined,
      backlinks: candidate.backlinks ?? undefined,
      referringDomains: candidate.referringDomains ?? undefined,
      domainAuthority: candidate.domainAuthority ?? undefined,
      organicTrafficEstimate: candidate.organicTrafficEstimate ?? undefined,
      status: 'discovered',
      createdAt: candidate.createdAt,
      updatedAt: new Date(),
      dropDate: candidate.dropDate ?? new Date(),
    });

    // Run email reputation check (real DNS lookups)
    const reputation = await checkEmailReputation(domain);

    // Persist scores
    await this.repo.updateScore(
      domain,
      evaluation.overallScore,
      reputation.overallScore,
      reputation.blacklisted,
      reputation.suitableForMailcow,
      reputation.warmingAdvantage
    );

    return this.repo.findByDomain(domain) as Promise<ExpiredCandidateRow>;
  }

  /**
   * Batch evaluate all discovered candidates.
   */
  async evaluateAll(): Promise<number> {
    const discovered = await this.repo.findByStatus('discovered');
    let evaluated = 0;

    for (const candidate of discovered) {
      try {
        await this.evaluateCandidate(candidate.domain);
        evaluated++;
      } catch (err) {
        console.error(`Failed to evaluate ${candidate.domain}:`, err);
      }
    }

    return evaluated;
  }
}
