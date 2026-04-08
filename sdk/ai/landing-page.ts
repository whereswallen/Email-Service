/**
 * AI landing page content generator for domain sales pages.
 * Uses Sonnet for high-quality copywriting.
 */

import { callClaude, parseAIJson, estimateCost } from './client';
import { landingPageSystemPrompt } from './prompts';
import type { AILandingPageContent, AILandingPageResult, AIAnalysisMetadata } from './types';
import type { AIValuationResult } from './types';

export interface LandingPageInput {
  domain: string;
  askingPrice?: number;
  aiValuation?: AIValuationResult;
  sellerNotes?: string;
  tone?: 'professional' | 'startup' | 'premium';
}

/**
 * Generate for-sale landing page copy.
 */
export async function generateLandingPage(input: LandingPageInput): Promise<{ result: AILandingPageResult; metadata: AIAnalysisMetadata }> {
  const userPrompt = `Generate a for-sale landing page for this domain:

Domain: ${input.domain}
${input.askingPrice ? `Asking Price: $${input.askingPrice.toLocaleString()}` : 'Price: Make an offer'}
${input.tone ? `Tone: ${input.tone}` : ''}
${input.sellerNotes ? `Seller Notes: ${input.sellerNotes}` : ''}

${input.aiValuation ? `## AI Analysis
Brandability: ${input.aiValuation.brandability}/100
Industries: ${input.aiValuation.industries.map((i) => i.industry).join(', ')}
Keyword Value: ${input.aiValuation.keywordValue}
Summary: ${input.aiValuation.narrative}` : ''}`;

  const response = await callClaude({
    model: 'sonnet',
    systemPrompt: landingPageSystemPrompt(),
    userPrompt,
    featureKey: 'landing_page',
  });

  const content = parseAIJson<AILandingPageContent>(response.text);
  const cost = estimateCost('sonnet', response.inputTokens, response.outputTokens);

  const metadata: AIAnalysisMetadata = {
    model: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: cost,
    cached: false,
    timestamp: new Date(),
  };

  return {
    result: { content, metadata },
    metadata,
  };
}
