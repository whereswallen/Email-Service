/**
 * Expired Domain Service -- pipeline for discovering, evaluating, and acquiring expired domains.
 */

import { ExpiredDomainCandidate, EmailReputationAssessment } from './types';
import { evaluateDomain } from './evaluator';
import { checkEmailReputation } from './reputation-check';

export class ExpiredDomainService {
  private candidates: Map<string, ExpiredDomainCandidate> = new Map();
  private budgetLimits = { daily: 100, weekly: 500, monthly: 1500 };
  private spent = { daily: 0, weekly: 0, monthly: 0 };

  setBudgetLimits(limits: { daily?: number; weekly?: number; monthly?: number }): void {
    Object.assign(this.budgetLimits, limits);
  }

  addCandidate(candidate: ExpiredDomainCandidate): void {
    this.candidates.set(candidate.domain, candidate);
  }

  async evaluateCandidate(domain: string): Promise<ExpiredDomainCandidate | undefined> {
    const candidate = this.candidates.get(domain);
    if (!candidate) return undefined;

    const evaluation = evaluateDomain(candidate);
    const reputation = await checkEmailReputation(domain);

    candidate.overallScore = evaluation.overallScore;
    candidate.emailReputationScore = reputation.overallScore;
    candidate.spamBlacklisted = reputation.blacklisted;
    candidate.suitableForMailcow = reputation.suitableForMailcow;
    candidate.warmingAdvantage = reputation.warmingAdvantage;
    candidate.status = 'evaluated';
    candidate.updatedAt = new Date();

    return candidate;
  }

  async evaluateAll(): Promise<ExpiredDomainCandidate[]> {
    const discovered = Array.from(this.candidates.values())
      .filter((c) => c.status === 'discovered');

    const results: ExpiredDomainCandidate[] = [];
    for (const candidate of discovered) {
      const evaluated = await this.evaluateCandidate(candidate.domain);
      if (evaluated) results.push(evaluated);
    }

    return results;
  }

  getTopCandidates(limit: number = 20): ExpiredDomainCandidate[] {
    return Array.from(this.candidates.values())
      .filter((c) => c.status === 'evaluated' && !c.spamBlacklisted)
      .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
      .slice(0, limit);
  }

  getMailcowCandidates(): ExpiredDomainCandidate[] {
    return Array.from(this.candidates.values())
      .filter((c) => c.suitableForMailcow && c.warmingAdvantage === 'high')
      .sort((a, b) => (b.emailReputationScore || 0) - (a.emailReputationScore || 0));
  }

  canAfford(cost: number): boolean {
    return (
      this.spent.daily + cost <= this.budgetLimits.daily &&
      this.spent.weekly + cost <= this.budgetLimits.weekly &&
      this.spent.monthly + cost <= this.budgetLimits.monthly
    );
  }

  recordSpend(amount: number): void {
    this.spent.daily += amount;
    this.spent.weekly += amount;
    this.spent.monthly += amount;
  }

  resetDailySpend(): void { this.spent.daily = 0; }
  resetWeeklySpend(): void { this.spent.weekly = 0; }
  resetMonthlySpend(): void { this.spent.monthly = 0; }

  getCandidates(filter?: { status?: string; minScore?: number }): ExpiredDomainCandidate[] {
    let results = Array.from(this.candidates.values());

    if (filter?.status) {
      results = results.filter((c) => c.status === filter.status);
    }
    if (filter?.minScore) {
      results = results.filter((c) => (c.overallScore || 0) >= filter.minScore!);
    }

    return results;
  }
}

export { evaluateDomain } from './evaluator';
export { checkEmailReputation } from './reputation-check';
export type { ExpiredDomainCandidate, EmailReputationAssessment } from './types';
