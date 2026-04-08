/**
 * AI portfolio intelligence — natural language queries against portfolio data.
 * Uses Sonnet for complex financial reasoning.
 */

import { callClaude, estimateCost } from './client';
import { portfolioIntelligenceSystemPrompt } from './prompts';
import type { AIPortfolioInsight, AIPortfolioResult, AIAnalysisMetadata } from './types';
import type { PortfolioAnalytics, PortfolioDomain } from '../types/domain-portfolio';

export interface PortfolioQueryInput {
  question: string;
  analytics: PortfolioAnalytics;
  /** Top domains by value (summarized, not full portfolio) */
  topDomains: PortfolioDomainSummary[];
  /** Domains expiring soon */
  expiringDomains: PortfolioDomainSummary[];
}

export interface PortfolioDomainSummary {
  domain: string;
  purpose: string;
  acquisitionCost: number;
  estimatedValue: number;
  annualRenewalCost: number;
  expiryDate: string;
  roi: number;
}

/**
 * Answer a natural language question about the user's portfolio.
 */
export async function queryPortfolio(input: PortfolioQueryInput): Promise<{ result: AIPortfolioResult; metadata: AIAnalysisMetadata }> {
  const { question, analytics, topDomains, expiringDomains } = input;

  const userPrompt = `## Portfolio Summary
Total Domains: ${analytics.totalDomains}
Total Invested: $${analytics.totalInvested.toLocaleString()}
Estimated Value: $${analytics.totalEstimatedValue.toLocaleString()}
Unrealized P&L: $${analytics.unrealizedPnL.toLocaleString()}
Annual Renewal Burn: $${analytics.annualRenewalBurn.toLocaleString()}/yr
ROI: ${analytics.roiPercent.toFixed(1)}%
Expiring in 30 days: ${analytics.expiringIn30Days}
Expiring in 90 days: ${analytics.expiringIn90Days}

## By Purpose
${Object.entries(analytics.byPurpose).map(([k, v]) => `${k}: ${v}`).join('\n')}

## By TLD
${Object.entries(analytics.byTld).map(([k, v]) => `.${k}: ${v}`).join('\n')}

## Top Domains (by value)
${topDomains.map((d) => `${d.domain} | cost: $${d.acquisitionCost} | value: $${d.estimatedValue} | renewal: $${d.annualRenewalCost}/yr | ROI: ${d.roi.toFixed(0)}% | expires: ${d.expiryDate} | purpose: ${d.purpose}`).join('\n')}

## Expiring Soon
${expiringDomains.length > 0
    ? expiringDomains.map((d) => `${d.domain} | expires: ${d.expiryDate} | value: $${d.estimatedValue} | renewal: $${d.annualRenewalCost}/yr | ROI: ${d.roi.toFixed(0)}%`).join('\n')
    : 'None expiring soon'}

## Question
${question}`;

  const response = await callClaude({
    model: 'sonnet',
    systemPrompt: portfolioIntelligenceSystemPrompt(),
    userPrompt,
    featureKey: 'portfolio_query',
  });

  const cost = estimateCost('sonnet', response.inputTokens, response.outputTokens);

  // Portfolio intelligence returns plain text, not JSON
  const domainsReferenced = topDomains
    .filter((d) => response.text.includes(d.domain))
    .map((d) => d.domain);

  const metadata: AIAnalysisMetadata = {
    model: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: cost,
    cached: false,
    timestamp: new Date(),
  };

  return {
    result: {
      insight: {
        answer: response.text,
        recommendations: [],
        domainsReferenced,
      },
      metadata,
    },
    metadata,
  };
}
