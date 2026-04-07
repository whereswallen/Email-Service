/**
 * Portfolio analytics -- P&L calculations, ROI tracking, burn rate analysis.
 */

import { PortfolioDomain, PortfolioTransaction, PortfolioPurpose } from '../types/domain-portfolio';

export interface PnLReport {
  realized: number;
  unrealized: number;
  total: number;
  acquisitionCosts: number;
  renewalCosts: number;
  salesRevenue: number;
}

export interface BurnRateReport {
  monthlyBurn: number;
  annualBurn: number;
  domainsCount: number;
  averageCostPerDomain: number;
  projectedNextQuarter: number;
}

export function calculatePnL(
  domains: PortfolioDomain[],
  transactions: PortfolioTransaction[]
): PnLReport {
  const acquisitionCosts = transactions
    .filter((tx) => tx.type === 'acquisition')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const renewalCosts = transactions
    .filter((tx) => tx.type === 'renewal')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const salesRevenue = transactions
    .filter((tx) => tx.type === 'sale')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const realized = salesRevenue - acquisitionCosts - renewalCosts;
  const unrealized = domains.reduce((sum, d) => sum + d.estimatedValue - d.totalInvested, 0);

  return {
    realized,
    unrealized,
    total: realized + unrealized,
    acquisitionCosts,
    renewalCosts,
    salesRevenue,
  };
}

export function calculateBurnRate(domains: PortfolioDomain[]): BurnRateReport {
  const annualBurn = domains.reduce((sum, d) => sum + d.annualRenewalCost, 0);
  const monthlyBurn = annualBurn / 12;

  return {
    monthlyBurn,
    annualBurn,
    domainsCount: domains.length,
    averageCostPerDomain: domains.length > 0 ? annualBurn / domains.length : 0,
    projectedNextQuarter: monthlyBurn * 3,
  };
}

export function groupByPurpose(domains: PortfolioDomain[]): Record<PortfolioPurpose, PortfolioDomain[]> {
  const groups: Record<PortfolioPurpose, PortfolioDomain[]> = {
    investment: [],
    customer: [],
    personal: [],
    parked: [],
  };

  for (const d of domains) {
    groups[d.purpose].push(d);
  }

  return groups;
}

export function getTopPerformers(domains: PortfolioDomain[], limit: number = 10): PortfolioDomain[] {
  return [...domains]
    .sort((a, b) => {
      const roiA = a.totalInvested > 0 ? (a.estimatedValue - a.totalInvested) / a.totalInvested : 0;
      const roiB = b.totalInvested > 0 ? (b.estimatedValue - b.totalInvested) / b.totalInvested : 0;
      return roiB - roiA;
    })
    .slice(0, limit);
}
