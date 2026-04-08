/**
 * Anthropic Claude API client singleton for the Helix platform.
 * Supports model selection (Haiku for bulk, Sonnet for complex reasoning).
 */

import Anthropic from '@anthropic-ai/sdk';

export type HelixModel = 'haiku' | 'sonnet';

const MODEL_IDS: Record<HelixModel, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

// Per-feature max_tokens caps to control costs
export const TOKEN_LIMITS: Record<string, number> = {
  valuation: 500,
  discovery: 2000,
  auction_advice: 800,
  landing_page: 1500,
  outbound_email: 2000,
  portfolio_query: 1000,
  name_generation: 800,
};

let _client: Anthropic | null = null;

export function getAnthropicClient(apiKey?: string): Anthropic {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function resolveModel(model: HelixModel): string {
  return MODEL_IDS[model];
}

export interface AICallOptions {
  model: HelixModel;
  systemPrompt: string;
  userPrompt: string;
  featureKey: string;
  maxTokens?: number;
}

export interface AICallResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Make a single Claude API call with cost controls.
 */
export async function callClaude(options: AICallOptions): Promise<AICallResult> {
  const client = getAnthropicClient();
  const modelId = resolveModel(options.model);
  const maxTokens = options.maxTokens ?? TOKEN_LIMITS[options.featureKey] ?? 1000;

  const response = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: options.systemPrompt,
    messages: [{ role: 'user', content: options.userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const text = textBlock?.type === 'text' ? textBlock.text : '';

  return {
    text,
    model: modelId,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/**
 * Parse JSON from Claude's response, stripping markdown fences if present.
 */
export function parseAIJson<T>(text: string): T {
  let cleaned = text.trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

// Cost estimates per 1M tokens (as of 2026)
const COSTS: Record<string, { input: number; output: number }> = {
  haiku: { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
};

export function estimateCost(model: HelixModel, inputTokens: number, outputTokens: number): number {
  const rates = COSTS[model] ?? COSTS.haiku;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}
