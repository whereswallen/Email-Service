/**
 * AI feature routes — all 7 AI endpoints under /api/ai.
 * All routes require authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AIServiceAPI } from '../services/ai-service';
import { getPool } from '../lib/db';
import { getRedis } from '../lib/redis';

let _aiService: AIServiceAPI | null = null;
function getAIService(): AIServiceAPI {
  if (!_aiService) _aiService = new AIServiceAPI(getPool(), getRedis());
  return _aiService;
}

export default async function aiRoutes(app: FastifyInstance) {
  // All AI routes require auth
  app.addHook('onRequest', app.authenticate);

  // -------------------------------------------------------------------------
  // 1. Smart Valuation
  // -------------------------------------------------------------------------
  app.post<{ Params: { domain: string }; Body: { force?: boolean } }>(
    '/valuation/:domain',
    async (request, reply) => {
      const ai = getAIService();
      const result = await ai.getValuation(
        request.user.id,
        {
          domain: request.params.domain,
          tld: request.params.domain.split('.').pop() || 'com',
        },
        request.body?.force ?? false
      );
      return result;
    }
  );

  // GET cached valuation
  app.get<{ Params: { domain: string } }>(
    '/valuation/:domain',
    async (request, reply) => {
      const ai = getAIService();
      // Don't force — only return if cached
      try {
        const result = await ai.getValuation(
          request.user.id,
          {
            domain: request.params.domain,
            tld: request.params.domain.split('.').pop() || 'com',
          },
          false
        );
        return result;
      } catch {
        return reply.status(404).send({ error: true, message: 'No cached valuation found' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // 2. Discovery Advisor
  // -------------------------------------------------------------------------
  app.post<{
    Body: {
      preferences?: {
        industries?: string[];
        budgetMin?: number;
        budgetMax?: number;
        tlds?: string[];
      };
      limit?: number;
    };
  }>(
    '/discovery',
    async (request, reply) => {
      const ai = getAIService();
      // In a real implementation, load candidates from the expired domain pipeline
      // For now, accept them in the body or load from DB
      const { ExpiredCandidateRepository } = await import('../repositories/expired-candidate-repository');
      const pool = getPool();
      const repo = new ExpiredCandidateRepository(pool);
      const candidates = await repo.findTopCandidates(request.body?.limit ?? 50);

      const result = await ai.getDiscoveryRecommendations(
        request.user.id,
        candidates,
        {
          preferredIndustries: request.body?.preferences?.industries,
          budgetMin: request.body?.preferences?.budgetMin,
          budgetMax: request.body?.preferences?.budgetMax,
          preferredTlds: request.body?.preferences?.tlds,
        }
      );
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // 3. Auction Copilot
  // -------------------------------------------------------------------------
  app.post<{
    Params: { id: string };
    Body: { maxBudget?: number };
  }>(
    '/auction/:id/advice',
    async (request, reply) => {
      const ai = getAIService();
      const pool = getPool();

      // Load auction and bids
      const { AuctionRepository } = await import('../repositories/auction-repository');
      const { BidRepository } = await import('../repositories/bid-repository');
      const auctionRepo = new AuctionRepository(pool);
      const bidRepo = new BidRepository(pool);

      const listing = await auctionRepo.findById(request.params.id);
      if (!listing) return reply.status(404).send({ error: true, message: 'Auction not found' });

      const bids = await bidRepo.findByAuction(request.params.id);

      const result = await ai.getAuctionAdvice(
        request.user.id,
        listing,
        bids,
        undefined,
        request.body?.maxBudget
      );
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // 4. Landing Page Writer
  // -------------------------------------------------------------------------
  app.post<{
    Params: { domain: string };
    Body: {
      askingPrice?: number;
      tone?: 'professional' | 'startup' | 'premium';
      sellerNotes?: string;
    };
  }>(
    '/landing-page/:domain',
    async (request, reply) => {
      const ai = getAIService();
      const result = await ai.generateLandingPage(request.user.id, {
        domain: request.params.domain,
        askingPrice: request.body?.askingPrice,
        tone: request.body?.tone,
        sellerNotes: request.body?.sellerNotes,
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // 5. Outbound Email Writer
  // -------------------------------------------------------------------------
  app.post<{
    Params: { domain: string };
    Body: {
      buyerProfile: {
        industry: string;
        companySize?: string;
        likelyUseCase?: string;
        companyName?: string;
      };
      askingPrice?: number;
      senderName?: string;
    };
  }>(
    '/outbound/:domain',
    async (request, reply) => {
      const ai = getAIService();
      const result = await ai.generateOutboundEmails(request.user.id, {
        domain: request.params.domain,
        buyerProfile: request.body.buyerProfile,
        askingPrice: request.body?.askingPrice,
        senderName: request.body?.senderName,
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // 6. Portfolio Intelligence
  // -------------------------------------------------------------------------
  app.post<{
    Body: { question: string };
  }>(
    '/portfolio/query',
    async (request, reply) => {
      if (!request.body?.question) {
        return reply.status(400).send({ error: true, message: 'Question is required' });
      }

      const ai = getAIService();
      const pool = getPool();

      // Load portfolio analytics
      const { PortfolioRepository } = await import('../repositories/portfolio-repository');
      const repo = new PortfolioRepository(pool);

      const analytics = await repo.getAnalytics(request.user.id);
      const topDomains = await repo.getTopByValue(request.user.id, 20);
      const expiring = await repo.getExpiring(request.user.id, 90);

      const result = await ai.queryPortfolio(request.user.id, {
        question: request.body.question,
        analytics,
        topDomains: topDomains.map((d: any) => ({
          domain: d.domain || d.domainId,
          purpose: d.purpose,
          acquisitionCost: d.acquisitionCost,
          estimatedValue: d.estimatedValue,
          annualRenewalCost: d.annualRenewalCost,
          expiryDate: d.expiryDate ? new Date(d.expiryDate).toISOString().split('T')[0] : 'unknown',
          roi: d.estimatedValue && d.acquisitionCost ? ((d.estimatedValue - d.acquisitionCost) / d.acquisitionCost) * 100 : 0,
        })),
        expiringDomains: expiring.map((d: any) => ({
          domain: d.domain || d.domainId,
          purpose: d.purpose,
          acquisitionCost: d.acquisitionCost,
          estimatedValue: d.estimatedValue,
          annualRenewalCost: d.annualRenewalCost,
          expiryDate: d.expiryDate ? new Date(d.expiryDate).toISOString().split('T')[0] : 'unknown',
          roi: d.estimatedValue && d.acquisitionCost ? ((d.estimatedValue - d.acquisitionCost) / d.acquisitionCost) * 100 : 0,
        })),
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // 7. Name Generator
  // -------------------------------------------------------------------------
  app.post<{
    Body: {
      keywords: string[];
      industry?: string;
      tlds?: string[];
      style?: 'brandable' | 'keyword' | 'compound' | 'short' | 'any';
      count?: number;
    };
  }>(
    '/names/generate',
    async (request, reply) => {
      if (!request.body?.keywords?.length) {
        return reply.status(400).send({ error: true, message: 'Keywords are required' });
      }

      const ai = getAIService();
      const result = await ai.generateNames(request.user.id, {
        keywords: request.body.keywords,
        industry: request.body.industry,
        tlds: request.body.tlds,
        style: request.body.style,
        count: request.body.count,
      });
      return result;
    }
  );

  // -------------------------------------------------------------------------
  // Usage Stats
  // -------------------------------------------------------------------------
  app.get<{ Querystring: { period?: string } }>(
    '/usage',
    async (request, reply) => {
      const ai = getAIService();
      const usage = await ai.getUsage(request.user.id, request.query?.period);
      return { usage };
    }
  );
}
