/**
 * Portfolio Service -- manages domain investments, valuations, and analytics.
 */

import {
  PortfolioDomain,
  PortfolioTransaction,
  PortfolioAnalytics,
  DomainValuation,
  AcquisitionMethod,
  PortfolioPurpose,
} from '../types/domain-portfolio';

export class PortfolioService {
  private domains: Map<string, PortfolioDomain> = new Map();
  private transactions: PortfolioTransaction[] = [];

  addDomain(entry: PortfolioDomain): void {
    this.domains.set(entry.id, entry);
  }

  removeDomain(id: string): boolean {
    return this.domains.delete(id);
  }

  getDomain(id: string): PortfolioDomain | undefined {
    return this.domains.get(id);
  }

  findByDomain(domain: string): PortfolioDomain | undefined {
    for (const entry of this.domains.values()) {
      if (entry.domain === domain) return entry;
    }
    return undefined;
  }

  listDomains(filter?: { purpose?: PortfolioPurpose; tld?: string; listedForSale?: boolean }): PortfolioDomain[] {
    let results = Array.from(this.domains.values());

    if (filter?.purpose) {
      results = results.filter((d) => d.purpose === filter.purpose);
    }
    if (filter?.tld) {
      results = results.filter((d) => d.tld === filter.tld);
    }
    if (filter?.listedForSale !== undefined) {
      results = results.filter((d) => d.listedForSale === filter.listedForSale);
    }

    return results;
  }

  recordTransaction(tx: PortfolioTransaction): void {
    this.transactions.push(tx);

    const domain = this.domains.get(tx.domainId);
    if (domain) {
      if (tx.type === 'renewal') {
        domain.totalInvested += tx.amount;
      }
      domain.updatedAt = new Date();
    }
  }

  getTransactions(domainId?: string): PortfolioTransaction[] {
    if (domainId) {
      return this.transactions.filter((tx) => tx.domainId === domainId);
    }
    return [...this.transactions];
  }

  getAnalytics(): PortfolioAnalytics {
    const domains = Array.from(this.domains.values());
    const now = new Date();

    const totalInvested = domains.reduce((sum, d) => sum + d.totalInvested, 0);
    const totalEstimatedValue = domains.reduce((sum, d) => sum + d.estimatedValue, 0);
    const annualRenewalBurn = domains.reduce((sum, d) => sum + d.annualRenewalCost, 0);

    const byPurpose: Record<PortfolioPurpose, number> = {
      investment: 0, customer: 0, personal: 0, parked: 0,
    };
    const byTld: Record<string, number> = {};

    for (const d of domains) {
      byPurpose[d.purpose]++;
      byTld[d.tld] = (byTld[d.tld] || 0) + 1;
    }

    const daysFromNow = (date: Date, days: number) => {
      const target = new Date(now);
      target.setDate(target.getDate() + days);
      return date <= target;
    };

    return {
      totalDomains: domains.length,
      totalInvested,
      totalEstimatedValue,
      unrealizedPnL: totalEstimatedValue - totalInvested,
      annualRenewalBurn,
      roiPercent: totalInvested > 0 ? ((totalEstimatedValue - totalInvested) / totalInvested) * 100 : 0,
      expiringIn30Days: domains.filter((d) => daysFromNow(d.expiryDate, 30)).length,
      expiringIn60Days: domains.filter((d) => daysFromNow(d.expiryDate, 60)).length,
      expiringIn90Days: domains.filter((d) => daysFromNow(d.expiryDate, 90)).length,
      byPurpose,
      byTld,
    };
  }

  getExpiringDomains(days: number): PortfolioDomain[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return Array.from(this.domains.values())
      .filter((d) => d.expiryDate <= cutoff)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }
}

export { valuateDomain } from './valuation';
