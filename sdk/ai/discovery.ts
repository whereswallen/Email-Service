/**
 * AI discovery advisor — ranks expired domain candidates with reasoning.
 * Uses batch prompting (up to 50 domains per call) for cost efficiency.
 */

import { callClaude, parseAIJson, estimateCost } from './client';
import { discoverySystemPrompt } from './prompts';
import type { AIDiscoveryResult, AIDiscoveryRecommendation, AIAnalysisMetadata } from './types';
import type { ExpiredDomainCandidate } from '../expired-domains/types';

export interface DiscoveryContext {
  /** User's existing portfolio domains for context */
  portfolioDomains?: string[];
  /** Preferred industries */
  preferredIndustries?: string[];
  /** Budget range */
  budgetMin?: number;
  budgetMax?: number;
  /** Preferred TLDs */
  preferredTlds?: string[];
}

/**
 * Rank a batch of expired domain candidates with AI reasoning.
 */
export async function rankCandidates(
  candidates: ExpiredDomainCandidate[],
  context: DiscoveryContext = {}
): Promise<{ result: AIDiscoveryResult; metadata: AIAnalysisMetadata }> {
  const candidateList = candidates.slice(0, 50).map((c) => ({
    domain: c.domain,
    tld: c.tld,
    domainAge: c.domainAgeYears,
    da: c.domainAuthority,
    backlinks: c.backlinks,
    traffic: c.organicTrafficEstimate,
    emailReputation: c.emailReputationScore,
    spamBlacklisted: c.spamBlacklisted,
    heuristicScore: c.overallScore,
  }));

  const userPrompt = `## Expired Domain Candidates

${JSON.stringify(candidateList, null, 2)}

## Investor Context
${context.portfolioDomains?.length ? `Current portfolio: ${context.portfolioDomains.join(', ')}` : 'New investor (no existing portfolio)'}
${context.preferredIndustries?.length ? `Preferred industries: ${context.preferredIndustries.join(', ')}` : ''}
${context.budgetMin || context.budgetMax ? `Budget range: $${context.budgetMin ?? 0} - $${context.budgetMax ?? 'unlimited'}` : ''}
${context.preferredTlds?.length ? `Preferred TLDs: ${context.preferredTlds.join(', ')}` : ''}

Rank ALL candidates from most to least recommended. Include every domain in your response.`;

  const response = await callClaude({
    model: 'haiku',
    systemPrompt: discoverySystemPrompt(),
    userPrompt,
    featureKey: 'discovery',
  });

  const parsed = parseAIJson<{ recommendations: AIDiscoveryRecommendation[] }>(response.text);
  const cost = estimateCost('haiku', response.inputTokens, response.outputTokens);

  return {
    result: { recommendations: parsed.recommendations, metadata: null as unknown as AIAnalysisMetadata },
    metadata: {
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      estimatedCostUsd: cost,
      cached: false,
      timestamp: new Date(),
    },
  };
}
