/**
 * Email management routes.
 */

import { FastifyInstance } from 'fastify';

export default async function emailRoutes(app: FastifyInstance) {
  // Register domain for email
  app.post('/domains', async (request) => {
    const body = request.body as { domain: string; provider?: string };
    return { domain: body.domain, status: 'pending_dns', placeholder: true };
  });

  // Get email domain DNS requirements
  app.get('/domains/:domain/dns', async (request) => {
    const { domain } = request.params as { domain: string };
    return { domain, records: [], placeholder: true };
  });

  // Verify email domain DNS
  app.post('/domains/:domain/verify', async (request) => {
    const { domain } = request.params as { domain: string };
    return { domain, allPassing: false, placeholder: true };
  });

  // Auto-configure DNS (when we control the registrar)
  app.post('/domains/:domain/auto-configure', async (request) => {
    const { domain } = request.params as { domain: string };
    return { domain, recordsSet: 0, placeholder: true };
  });

  // Create mailbox
  app.post('/mailboxes', async (request) => {
    const body = request.body as { domain: string; address: string; password: string };
    return { fullAddress: `${body.address}@${body.domain}`, placeholder: true };
  });

  // List mailboxes
  app.get('/mailboxes', async (request) => {
    const { domain } = request.query as { domain?: string };
    return { mailboxes: [], domain, placeholder: true };
  });

  // Delete mailbox
  app.delete('/mailboxes/:address', async (request) => {
    const { address } = request.params as { address: string };
    return { address, deleted: true, placeholder: true };
  });

  // Reset password
  app.post('/mailboxes/:address/reset-password', async (request) => {
    const { address } = request.params as { address: string };
    return { address, success: true, placeholder: true };
  });
}
