/**
 * AI service — orchestrates cache, DB, and Claude API calls for all AI features.
 */

import { Pool } from 'pg';
import IORedis from 'ioredis';
import { AIAnalysisRepository } from '../repositories/ai-analysis-repository';
import { buildCacheKey, hashInput, shouldCache, getExpiresAt, CACHE_TTLS } from '../../../sdk/ai/cache';
import type { AIAnalysisType, AIAnalysisMetadata, MergedValuation, AIDiscoveryResult, AIAuctionResult, AILandingPageResult, AIOutboundResult, AIPortfolioResult, AINameGeneratorResult } from '../../../sdk/ai/types';
import { analyzeWithAI, mergeValuation, type AIValuationInput } from '../../../sdk/ai/valuation';
import { rankCandidates, type DiscoveryContext } from '../../../sdk/ai/discovery';
import { getAuctionAdvice, type AuctionContext } from '../../../sdk/ai/auction-copilot';
import { generateLandingPage, type LandingPageInput } from '../../../sdk/ai/landing-page';
import { generateOutboundEmails, type OutboundEmailInput } from '../../../sdk/ai/outbound-email';
import { queryPortfolio, type PortfolioQueryInput } from '../../../sdk/ai/portfolio-intelligence';
import { generateNames, type NameGeneratorInput } from '../../../sdk/ai/name-generator';
import type { ExpiredDomainCandidate } from '../../../sdk/expired-domains/types';
import type { AuctionListing, Bid } from '../../../sdk/types/auction';

export class AIServiceAPI {
  private repo: AIAnalysisRepository;
  private redis: IORedis;

  constructor(pool: Pool, redis: IORedis) {
    this.repo = new AIAnalysisRepository(pool);
    this.redis = redis;
  }

  // ---------------------------------------------------------------------------
  // 1. Smart Valuation
  // ---------------------------------------------------------------------------

  async getValuation(customerId: string, input: AIValuationInput, force = false): Promise<MergedValuation> {
    const type: AIAnalysisType = 'valuation';
    const inputData = { domain: input.domain, tld: input.tld, da: input.domainAuthority, bl: input.backlinks };
    const hash = hashInput(inputData);

    if (!force) {
      // Check Redis cache
      const cacheKey = buildCacheKey(type, input.domain, hash);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as MergedValuation;
        parsed.metadata.cached = true;
        return parsed;
      }

      // Check DB
      const dbResult = await this.repo.findByHash(hash, type);
      if (dbResult) {
        const result = dbResult.result as unknown as MergedValuation;
        result.metadata = { ...result.metadata, cached: true };
        await this.redis.setex(cacheKey, CACHE_TTLS[type], JSON.stringify(result));
        return result;
      }
    }

    // Call Claude
    const { result: aiResult, metadata } = await analyzeWithAI(input);
    const merged = mergeValuation(input, aiResult, metadata);

    // Persist
    await this.repo.create({
      domain: input.domain,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hash,
      result: merged as unknown as Record<string, unknown>,
      promptSummary: `Valuation of ${input.domain}`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: getExpiresAt(type),
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);

    // Cache in Redis
    if (shouldCache(type)) {
      const cacheKey = buildCacheKey(type, input.domain, hash);
      await this.redis.setex(cacheKey, CACHE_TTLS[type], JSON.stringify(merged));
    }

    return merged;
  }

  // ---------------------------------------------------------------------------
  // 2. Discovery Advisor
  // ---------------------------------------------------------------------------

  async getDiscoveryRecommendations(
    customerId: string,
    candidates: ExpiredDomainCandidate[],
    context: DiscoveryContext = {}
  ): Promise<AIDiscoveryResult> {
    const type: AIAnalysisType = 'discovery';
    const hash = hashInput({ domains: candidates.map((c) => c.domain), ...context });

    // Check cache
    const cacheKey = buildCacheKey(type, customerId, hash);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as AIDiscoveryResult;
      parsed.metadata.cached = true;
      return parsed;
    }

    const { result, metadata } = await rankCandidates(candidates, context);
    result.metadata = metadata;

    await this.repo.create({
      domain: null,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hash,
      result: result as unknown as Record<string, unknown>,
      promptSummary: `Discovery ranking of ${candidates.length} candidates`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: getExpiresAt(type),
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);

    if (shouldCache(type)) {
      await this.redis.setex(cacheKey, CACHE_TTLS[type], JSON.stringify(result));
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // 3. Auction Copilot
  // ---------------------------------------------------------------------------

  async getAuctionAdvice(
    customerId: string,
    listing: AuctionListing,
    bidHistory: Bid[],
    aiValuationEstimate?: number,
    userMaxBudget?: number
  ): Promise<AIAuctionResult> {
    const type: AIAnalysisType = 'auction_advice';
    const context: AuctionContext = { listing, bidHistory, aiValuationEstimate, userMaxBudget };

    const { result, metadata } = await getAuctionAdvice(context);

    await this.repo.create({
      domain: listing.domain,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hashInput({ auctionId: listing.id, bidCount: listing.bidCount }),
      result: result as unknown as Record<string, unknown>,
      promptSummary: `Auction advice for ${listing.domain}`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: getExpiresAt(type),
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);
    return result;
  }

  // ---------------------------------------------------------------------------
  // 4. Landing Page Writer
  // ---------------------------------------------------------------------------

  async generateLandingPage(customerId: string, input: LandingPageInput): Promise<AILandingPageResult> {
    const type: AIAnalysisType = 'landing_page';
    const hash = hashInput({ domain: input.domain, tone: input.tone });

    // Check cache
    if (shouldCache(type)) {
      const cacheKey = buildCacheKey(type, input.domain, hash);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as AILandingPageResult;
        parsed.metadata.cached = true;
        return parsed;
      }
    }

    const { result, metadata } = await generateLandingPage(input);

    await this.repo.create({
      domain: input.domain,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hash,
      result: result as unknown as Record<string, unknown>,
      promptSummary: `Landing page for ${input.domain}`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: getExpiresAt(type),
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);

    if (shouldCache(type)) {
      const cacheKey = buildCacheKey(type, input.domain, hash);
      await this.redis.setex(cacheKey, CACHE_TTLS[type], JSON.stringify(result));
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // 5. Outbound Email Writer
  // ---------------------------------------------------------------------------

  async generateOutboundEmails(customerId: string, input: OutboundEmailInput): Promise<AIOutboundResult> {
    const type: AIAnalysisType = 'outbound_email';

    const { result, metadata } = await generateOutboundEmails(input);

    await this.repo.create({
      domain: input.domain,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hashInput({ domain: input.domain, buyer: input.buyerProfile }),
      result: result as unknown as Record<string, unknown>,
      promptSummary: `Outbound emails for ${input.domain} → ${input.buyerProfile.industry}`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: null,
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);
    return result;
  }

  // ---------------------------------------------------------------------------
  // 6. Portfolio Intelligence
  // ---------------------------------------------------------------------------

  async queryPortfolio(customerId: string, input: PortfolioQueryInput): Promise<AIPortfolioResult> {
    const type: AIAnalysisType = 'portfolio_query';

    const { result, metadata } = await queryPortfolio(input);

    await this.repo.create({
      domain: null,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hashInput({ question: input.question }),
      result: result as unknown as Record<string, unknown>,
      promptSummary: `Portfolio query: "${input.question.substring(0, 100)}"`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: getExpiresAt(type),
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);
    return result;
  }

  // ---------------------------------------------------------------------------
  // 7. Name Generator
  // ---------------------------------------------------------------------------

  async generateNames(customerId: string, input: NameGeneratorInput): Promise<AINameGeneratorResult> {
    const type: AIAnalysisType = 'name_generation';

    const { result, metadata } = await generateNames(input);

    await this.repo.create({
      domain: null,
      customerId,
      analysisType: type,
      modelUsed: metadata.model,
      inputHash: hashInput(input),
      result: result as unknown as Record<string, unknown>,
      promptSummary: `Name generation: ${input.keywords.join(', ')}`,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      estimatedCostUsd: metadata.estimatedCostUsd,
      expiresAt: null,
    } as Partial<any>);

    await this.repo.trackUsage(customerId, type, metadata.inputTokens, metadata.outputTokens, metadata.estimatedCostUsd);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Usage
  // ---------------------------------------------------------------------------

  async getUsage(customerId: string, period?: string) {
    return this.repo.getUsage(customerId, period);
  }
}
