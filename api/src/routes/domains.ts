/**
 * Domain registration and management routes.
 */

import { FastifyInstance } from 'fastify';
import { DomainServiceAPI } from '../services/domain-service';
import { getPool } from '../lib/db';

export default async function domainRoutes(app: FastifyInstance) {
  const service = new DomainServiceAPI(getPool());

  // Check domain availability
  app.get('/check/:domain', async (request) => {
    const { domain } = request.params as { domain: string };
    return service.checkAvailability(domain);
  });

  // Register a domain
  app.post('/register', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { domain, years, contact } = request.body as { domain: string; years: number; contact: Record<string, string> };
    const result = await service.register(domain, years || 1, contact, request.user.id);
    reply.status(201);
    return result;
  });

  // List user's domains
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const { page, limit } = request.query as Record<string, string>;
    return service.listDomains(request.user.id, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '50', 10),
    });
  });

  // Get domain info
  app.get('/:domain', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    return service.getDomain(domain);
  });

  // Get DNS records
  app.get('/:domain/dns', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    return service.getDNSRecords(domain);
  });

  // Set DNS records
  app.put('/:domain/dns', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    const { records } = request.body as { records: any[] };
    await service.setDNSRecords(domain, records);
    return { success: true };
  });

  // Transfer domain in
  app.post('/transfer', { preHandler: [app.authenticate] }, async (request) => {
    const { domain, authCode } = request.body as { domain: string; authCode: string };
    return service.transfer(domain, authCode);
  });

  // Renew domain
  app.post('/:domain/renew', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    return service.renew(domain);
  });

  // Set auto-renew
  app.patch('/:domain/auto-renew', { preHandler: [app.authenticate] }, async (request) => {
    const { domain } = request.params as { domain: string };
    const { enabled } = request.body as { enabled: boolean };
    await service.setAutoRenew(domain, enabled);
    return { success: true };
  });

  // Get expiring domains
  app.get('/expiring/:days', { preHandler: [app.authenticate] }, async (request) => {
    const { days } = request.params as { days: string };
    return service.getExpiring(parseInt(days, 10));
  });
}
