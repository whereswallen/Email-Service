/**
 * AI domain name generator — suggests available domain names.
 * Uses Haiku for fast, cost-effective name ideation.
 */

import { callClaude, parseAIJson, estimateCost } from './client';
import { nameGeneratorSystemPrompt } from './prompts';
import type { AINameSuggestion, AINameGeneratorResult, AIAnalysisMetadata } from './types';

export interface NameGeneratorInput {
  keywords: string[];
  industry?: string;
  tlds?: string[];
  style?: 'brandable' | 'keyword' | 'compound' | 'short' | 'any';
  count?: number;
}

/**
 * Generate domain name suggestions based on criteria.
 */
export async function generateNames(input: NameGeneratorInput): Promise<{ result: AINameGeneratorResult; metadata: AIAnalysisMetadata }> {
  const count = input.count ?? 10;
  const tlds = input.tlds ?? ['com', 'io', 'co'];

  const userPrompt = `Generate ${count} domain name suggestions:

Keywords: ${input.keywords.join(', ')}
${input.industry ? `Industry: ${input.industry}` : ''}
TLDs to consider: ${tlds.map((t) => `.${t}`).join(', ')}
${input.style && input.style !== 'any' ? `Preferred style: ${input.style}` : 'Mix of styles'}

Generate creative, memorable names. Prioritize .com when possible.`;

  const response = await callClaude({
    model: 'haiku',
    systemPrompt: nameGeneratorSystemPrompt(),
    userPrompt,
    featureKey: 'name_generation',
  });

  const parsed = parseAIJson<{ suggestions: AINameSuggestion[] }>(response.text);
  const cost = estimateCost('haiku', response.inputTokens, response.outputTokens);

  const metadata: AIAnalysisMetadata = {
    model: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: cost,
    cached: false,
    timestamp: new Date(),
  };

  return {
    result: { suggestions: parsed.suggestions, metadata },
    metadata,
  };
}
