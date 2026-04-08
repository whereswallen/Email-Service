/**
 * AI-enhanced domain valuation.
 * Calls Claude Haiku for linguistic/contextual analysis, then merges with heuristic scores.
 */

import { callClaude, parseAIJson, estimateCost } from './client';
import { valuationSystemPrompt } from './prompts';
import type { AIValuationResult, MergedValuation, AIAnalysisMetadata } from './types';
import { valuateDomain } from '../domain-portfolio/valuation';

export interface AIValuationInput {
  domain: string;
  tld: string;
  domainAge?: number;
  domainAuthority?: number;
  backlinks?: number;
  referringDomains?: number;
  organicTraffic?: number;
  emailReputationScore?: number;
}

/**
 * Run AI linguistic analysis on a domain name.
 */
export async function analyzeWithAI(input: AIValuationInput): Promise<{ result: AIValuationResult; metadata: AIAnalysisMetadata }> {
  const userPrompt = `Analyze this domain name:

Domain: ${input.domain}
TLD: .${input.tld}
${input.domainAge ? `Domain Age: ${input.domainAge} years` : ''}
${input.domainAuthority ? `Domain Authority: ${input.domainAuthority}/100` : ''}
${input.backlinks ? `Backlinks: ${input.backlinks.toLocaleString()}` : ''}
${input.referringDomains ? `Referring Domains: ${input.referringDomains.toLocaleString()}` : ''}
${input.organicTraffic ? `Monthly Organic Traffic: ${input.organicTraffic.toLocaleString()}` : ''}
${input.emailReputationScore ? `Email Reputation Score: ${input.emailReputationScore}/100` : ''}`;

  const response = await callClaude({
    model: 'haiku',
    systemPrompt: valuationSystemPrompt(),
    userPrompt,
    featureKey: 'valuation',
  });

  const result = parseAIJson<AIValuationResult>(response.text);
  const cost = estimateCost('haiku', response.inputTokens, response.outputTokens);

  return {
    result,
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

/**
 * Merge heuristic valuation with AI analysis.
 * Blend: 60% heuristic, 40% AI-adjusted.
 */
export function mergeValuation(input: AIValuationInput, aiResult: AIValuationResult, metadata: AIAnalysisMetadata): MergedValuation {
  const sld = input.domain.split('.')[0];
  const heuristic = valuateDomain({
    domain: input.domain,
    tld: input.tld,
    domainAge: input.domainAge,
    domainLength: sld.length,
    domainAuthority: input.domainAuthority,
    backlinks: input.backlinks,
    referringDomains: input.referringDomains,
    organicTraffic: input.organicTraffic,
    hasNumbers: /\d/.test(sld),
    hasHyphens: sld.includes('-'),
    emailReputationScore: input.emailReputationScore,
  });

  // AI score: average of brandability, pronounceability, memorability
  const aiScore = (aiResult.brandability + aiResult.pronounceability + aiResult.memorability) / 3;

  // Keyword and industry bonuses
  const keywordBonus = aiResult.keywordValue === 'high' ? 1.3 : aiResult.keywordValue === 'medium' ? 1.1 : 1.0;

  // Blend: 60% heuristic value, 40% AI-adjusted value
  const aiAdjustedValue = heuristic.estimatedValue * (aiScore / 50) * keywordBonus;
  const blendedValue = Math.round((heuristic.estimatedValue * 0.6 + aiAdjustedValue * 0.4) * 100) / 100;

  // Confidence upgrade if AI and heuristic agree
  let confidence = heuristic.confidence;
  if (aiScore > 70 && heuristic.confidence === 'medium') confidence = 'high';
  if (aiScore < 30 && heuristic.confidence === 'medium') confidence = 'low';

  return {
    domain: input.domain,
    heuristicValue: heuristic.estimatedValue,
    aiAdjustedValue: blendedValue,
    confidence,
    heuristicFactors: heuristic.factors,
    aiAnalysis: aiResult,
    metadata,
  };
}
