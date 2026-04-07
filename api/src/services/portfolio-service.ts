/**
 * Portfolio service -- wraps SDK business logic with database persistence.
 */

import { Pool } from 'pg';
import { PortfolioRepository, PortfolioFilter, PortfolioEntryRow } from '../repositories/portfolio-repository';
import { PortfolioTxRepository, PortfolioTxRow } from '../repositories/portfolio-tx-repository';
import { DomainRepository } from '../repositories/domain-repository';
import { PaginationOptions, PaginatedResult } from '../repositories/base-repository';
import { valuateDomain } from '../../../sdk/domain-portfolio/valuation';
import { calculatePnL, calculateBurnRate } from '../../../sdk/domain-portfolio/analytics';
import { checkExpiryAlerts, checkBlacklistAlerts } from '../../../sdk/domain-portfolio/alerts';
import { NotFoundError } from '../lib/errors';

export class PortfolioServiceAPI {
  private portfolioRepo: PortfolioRepository;
  private txRepo: PortfolioTxRepository;
  private domainRepo: DomainRepository;

  constructor(pool: Pool) {
    this.portfolioRepo = new PortfolioRepository(pool);
    this.txRepo = new PortfolioTxRepository(pool);
    this.domainRepo = new DomainRepository(pool);
  }

  async addDomain(data: Partial<PortfolioEntryRow>): Promise<PortfolioEntryRow> {
    const entry = await this.portfolioRepo.create(data);

    // Record acquisition transaction
    if (data.acquisitionCost && data.domainId) {
      await this.txRepo.create({
        domainId: data.domainId,
        type: 'acquisition',
        amount: data.acquisitionCost,
        transactionDate: new Date(),
      } as any);
    }

    return entry;
  }

  async getDomain(id: string): Promise<PortfolioEntryRow> {
    const entry = await this.portfolioRepo.findById(id);
    if (!entry) throw new NotFoundError('Portfolio entry', id);
    return entry;
  }

  async listDomains(filter: PortfolioFilter, pagination: PaginationOptions): Promise<PaginatedResult<PortfolioEntryRow>> {
    return this.portfolioRepo.findAll(filter, pagination);
  }

  async updateDomain(id: string, data: Partial<PortfolioEntryRow>): Promise<PortfolioEntryRow> {
    const updated = await this.portfolioRepo.update(id, data);
    if (!updated) throw new NotFoundError('Portfolio entry', id);
    return updated;
  }

  async removeDomain(id: string): Promise<void> {
    const deleted = await this.portfolioRepo.delete(id);
    if (!deleted) throw new NotFoundError('Portfolio entry', id);
  }

  async getAnalytics() {
    return this.portfolioRepo.getAnalytics();
  }

  async getValuation(domain: string) {
    const parts = domain.split('.');
    const name = parts[0];
    const tld = parts.slice(1).join('.');

    // Look up portfolio entry for additional data
    const domainRow = await this.domainRepo.findByDomain(domain);
    let portfolioEntry: PortfolioEntryRow | null = null;
    if (domainRow) {
      portfolioEntry = await this.portfolioRepo.findByDomainId(domainRow.id);
    }

    return valuateDomain({
      domain,
      tld,
      domainLength: name.length,
      domainAuthority: portfolioEntry?.domainAuthority ?? undefined,
      backlinks: portfolioEntry?.backlinks ?? undefined,
      referringDomains: portfolioEntry?.referringDomains ?? undefined,
      emailReputationScore: portfolioEntry?.emailReputationScore ?? undefined,
      hasHyphens: name.includes('-'),
      hasNumbers: /\d/.test(name),
    });
  }

  async getExpiring(days: number) {
    return this.domainRepo.findExpiring(days);
  }

  async getTransactions(domainId: string): Promise<PortfolioTxRow[]> {
    return this.txRepo.findByDomain(domainId);
  }

  async recordTransaction(data: Partial<PortfolioTxRow>): Promise<PortfolioTxRow> {
    return this.txRepo.create(data);
  }

  async getPnL() {
    const analytics = await this.portfolioRepo.getAnalytics();
    return {
      ...analytics,
      unrealizedPnL: analytics.totalEstimatedValue - analytics.totalInvested,
      roiPercent: analytics.totalInvested > 0
        ? ((analytics.totalEstimatedValue - analytics.totalInvested) / analytics.totalInvested) * 100
        : 0,
    };
  }
}
