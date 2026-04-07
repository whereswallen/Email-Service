/**
 * Domain portfolio and investing types.
 */

import { RegistrarType } from './index';

export type AcquisitionMethod = 'registration' | 'auction' | 'expired' | 'transfer' | 'backorder';
export type PortfolioPurpose = 'investment' | 'customer' | 'personal' | 'parked';
export type ValuationMethod = 'manual' | 'algorithm' | 'comparable_sales';

export interface PortfolioDomain {
  id: string;
  domain: string;
  tld: string;
  registrar: RegistrarType;
  purpose: PortfolioPurpose;

  // Financials
  acquisitionCost: number;
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  annualRenewalCost: number;
  totalInvested: number;

  // Valuation
  estimatedValue: number;
  valuationDate: Date;
  valuationMethod: ValuationMethod;

  // SEO metrics
  domainAuthority?: number;
  backlinks?: number;
  referringDomains?: number;
  organicTraffic?: number;

  // Email reputation (integration with Mailcow pipeline)
  emailReputationScore?: number;
  spamBlacklisted?: boolean;

  // Status
  expiryDate: Date;
  autoRenew: boolean;
  listedForSale: boolean;
  salePrice?: number;

  // Metadata
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioTransaction {
  id: string;
  domainId: string;
  type: 'acquisition' | 'renewal' | 'sale' | 'transfer_fee';
  amount: number;
  counterparty?: string;
  stripePaymentId?: string;
  transactionDate: Date;
  notes?: string;
}

export interface PortfolioAnalytics {
  totalDomains: number;
  totalInvested: number;
  totalEstimatedValue: number;
  unrealizedPnL: number;
  annualRenewalBurn: number;
  roiPercent: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  byPurpose: Record<PortfolioPurpose, number>;
  byTld: Record<string, number>;
}

export interface DomainValuation {
  domain: string;
  estimatedValue: number;
  confidence: 'low' | 'medium' | 'high';
  method: ValuationMethod;
  factors: ValuationFactor[];
  valuedAt: Date;
}

export interface ValuationFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}
