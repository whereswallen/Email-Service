/**
 * AI auction copilot — bid strategy advisor.
 * Uses Sonnet for complex multi-step reasoning about auction dynamics.
 */

import { callClaude, parseAIJson, estimateCost } from './client';
import { auctionCopilotSystemPrompt } from './prompts';
import type { AIAuctionAdvice, AIAuctionResult, AIAnalysisMetadata } from './types';
import type { AuctionListing, Bid } from '../types/auction';

export interface AuctionContext {
  listing: AuctionListing;
  bidHistory: Bid[];
  aiValuationEstimate?: number;
  userMaxBudget?: number;
}

/**
 * Get AI-powered auction bidding advice.
 */
export async function getAuctionAdvice(context: AuctionContext): Promise<{ result: AIAuctionResult; metadata: AIAnalysisMetadata }> {
  const { listing, bidHistory, aiValuationEstimate, userMaxBudget } = context;

  const timeLeft = Math.max(0, (new Date(listing.endsAt).getTime() - Date.now()) / (1000 * 60));

  const userPrompt = `## Auction Details
Domain: ${listing.domain}
Type: ${listing.type}
Starting Price: $${listing.startingPrice}
Current Bid: $${listing.currentBid ?? 'None'}
Bid Count: ${listing.bidCount}
Reserve Price: ${listing.reservePrice ? `$${listing.reservePrice}` : 'No reserve'}
Buy Now Price: ${listing.buyNowPrice ? `$${listing.buyNowPrice}` : 'N/A'}
Minimum Increment: $${listing.minimumIncrement}
Time Remaining: ${Math.round(timeLeft)} minutes
Auto-Extend: ${listing.autoExtend ? `Yes (${listing.autoExtendMinutes} min)` : 'No'}

## Domain Metrics
TLD: .${listing.tld}
Domain Age: ${listing.domainAge ?? 'Unknown'} years
Backlinks: ${listing.backlinks ?? 'Unknown'}
Domain Authority: ${listing.domainAuthority ?? 'Unknown'}
Has Email Reputation: ${listing.hasEmailReputation ? 'Yes' : 'No'}

## AI Valuation Estimate
${aiValuationEstimate ? `$${aiValuationEstimate}` : 'Not available'}

## Bid History (most recent first)
${bidHistory.length > 0
    ? bidHistory.slice(0, 20).map((b) => `$${b.amount} by bidder ${b.bidderId.substring(0, 8)} at ${new Date(b.createdAt).toISOString()}`).join('\n')
    : 'No bids yet'}

## My Budget
${userMaxBudget ? `$${userMaxBudget}` : 'Flexible'}`;

  const response = await callClaude({
    model: 'sonnet',
    systemPrompt: auctionCopilotSystemPrompt(),
    userPrompt,
    featureKey: 'auction_advice',
  });

  const advice = parseAIJson<AIAuctionAdvice>(response.text);
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
    result: { advice, metadata },
    metadata,
  };
}
