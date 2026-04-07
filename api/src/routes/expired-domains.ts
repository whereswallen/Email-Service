/**
 * Expired domain pipeline routes.
 */

import { FastifyInstance } from 'fastify';
import { ExpiredDomainServiceAPI } from '../services/expired-domain-service';
import { getPool } from '../lib/db';

export default async function expiredDomainRoutes(app: FastifyInstance) {
  const service = new ExpiredDomainServiceAPI(getPool());

  // List candidates by status
  app.get('/candidates', { preHandler: [app.authenticate] }, async (request) => {
    const { status } = request.query as { status?: string };
    if (status) {
      return service.getCandidatesByStatus(status);
    }
    return service.getTopCandidates(50);
  });

  // Get single candidate
  app.get('/candidates/:domain', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    return service.getCandidate(domain);
  });

  // Add candidate manually
  app.post('/candidates', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const candidate = await service.addCandidate(body as any);
    reply.status(201);
    return candidate;
  });

  // Bulk add candidates
  app.post('/candidates/bulk', { preHandler: [app.authenticate] }, async (request) => {
    const { candidates } = request.body as { candidates: any[] };
    const count = await service.addCandidates(candidates);
    return { added: count };
  });

  // Evaluate a single candidate
  app.post('/candidates/:domain/evaluate', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    return service.evaluateCandidate(domain);
  });

  // Batch evaluate all discovered candidates
  app.post('/evaluate-all', { preHandler: [app.authenticate] }, async () => {
    const count = await service.evaluateAll();
    return { evaluated: count };
  });

  // Get top scored candidates
  app.get('/top', { preHandler: [app.authenticate] }, async (request) => {
    const { limit } = request.query as { limit?: string };
    return service.getTopCandidates(parseInt(limit || '20', 10));
  });

  // Get Mailcow-suitable candidates
  app.get('/mailcow-candidates', { preHandler: [app.authenticate] }, async () => {
    return service.getMailcowCandidates();
  });
}
