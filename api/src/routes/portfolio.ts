/**
 * Portfolio management routes.
 */

import { FastifyInstance } from 'fastify';
import { PortfolioServiceAPI } from '../services/portfolio-service';
import { getPool } from '../lib/db';

export default async function portfolioRoutes(app: FastifyInstance) {
  const service = new PortfolioServiceAPI(getPool());

  // Get portfolio analytics
  app.get('/analytics', { preHandler: [app.authenticate] }, async () => {
    return service.getAnalytics();
  });

  // Get P&L report
  app.get('/pnl', { preHandler: [app.authenticate] }, async () => {
    return service.getPnL();
  });

  // List portfolio domains
  app.get('/domains', { preHandler: [app.authenticate] }, async (request) => {
    const { purpose, tld, listedForSale, minValue, maxValue, page, limit } = request.query as Record<string, string>;
    return service.listDomains(
      {
        purpose,
        tld,
        listedForSale: listedForSale === 'true' ? true : listedForSale === 'false' ? false : undefined,
        minValue: minValue ? parseFloat(minValue) : undefined,
        maxValue: maxValue ? parseFloat(maxValue) : undefined,
      },
      { page: parseInt(page || '1', 10), limit: parseInt(limit || '50', 10) }
    );
  });

  // Add domain to portfolio
  app.post('/domains', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const entry = await service.addDomain(body as any);
    reply.status(201);
    return entry;
  });

  // Get single portfolio entry
  app.get('/domains/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return service.getDomain(id);
  });

  // Update portfolio entry
  app.patch('/domains/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    return service.updateDomain(id, body as any);
  });

  // Delete portfolio entry
  app.delete('/domains/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.removeDomain(id);
    reply.status(204);
  });

  // Get domain valuation
  app.get('/valuation/:domain', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    return service.getValuation(domain);
  });

  // Get expiring domains
  app.get('/expiring', { preHandler: [app.authenticate] }, async (request) => {
    const { days } = request.query as { days?: string };
    return service.getExpiring(parseInt(days || '30', 10));
  });

  // Get transactions for a domain
  app.get('/domains/:id/transactions', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return service.getTransactions(id);
  });

  // Record a transaction
  app.post('/domains/:id/transactions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const tx = await service.recordTransaction({ ...body, domainId: id } as any);
    reply.status(201);
    return tx;
  });
}
