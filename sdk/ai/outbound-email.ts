/**
 * AI outbound email writer for domain sales cold outreach.
 * Generates 3 tone variants + 2 follow-ups using Sonnet.
 */

import { callClaude, parseAIJson, estimateCost } from './client';
import { outboundEmailSystemPrompt } from './prompts';
import type { AIOutboundSequence, AIOutboundResult, AIAnalysisMetadata } from './types';

export interface OutboundEmailInput {
  domain: string;
  askingPrice?: number;
  buyerProfile: {
    industry: string;
    companySize?: string;
    likelyUseCase?: string;
    companyName?: string;
  };
  senderName?: string;
}

/**
 * Generate a complete outbound email sequence.
 */
export async function generateOutboundEmails(input: OutboundEmailInput): Promise<{ result: AIOutboundResult; metadata: AIAnalysisMetadata }> {
  const userPrompt = `Generate an outbound email sequence to sell this domain:

Domain: ${input.domain}
${input.askingPrice ? `Asking Price: $${input.askingPrice.toLocaleString()}` : 'Price: Open to offers'}
${input.senderName ? `From: ${input.senderName}` : ''}

## Target Buyer Profile
Industry: ${input.buyerProfile.industry}
${input.buyerProfile.companySize ? `Company Size: ${input.buyerProfile.companySize}` : ''}
${input.buyerProfile.likelyUseCase ? `Likely Use: ${input.buyerProfile.likelyUseCase}` : ''}
${input.buyerProfile.companyName ? `Company: ${input.buyerProfile.companyName}` : ''}`;

  const response = await callClaude({
    model: 'sonnet',
    systemPrompt: outboundEmailSystemPrompt(),
    userPrompt,
    featureKey: 'outbound_email',
  });

  const sequence = parseAIJson<AIOutboundSequence>(response.text);
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
    result: { sequence, metadata },
    metadata,
  };
}
