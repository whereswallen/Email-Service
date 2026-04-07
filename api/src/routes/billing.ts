/**
 * Billing routes.
 */

import { FastifyInstance } from 'fastify';

export default async function billingRoutes(app: FastifyInstance) {
  // Get customer subscriptions
  app.get('/subscriptions', async () => {
    return { subscriptions: [], placeholder: true };
  });

  // Get billing history
  app.get('/transactions', async (request) => {
    const { type, limit } = request.query as { type?: string; limit?: string };
    return { transactions: [], filter: { type }, limit: parseInt(limit || '50', 10), placeholder: true };
  });

  // Get invoices
  app.get('/invoices', async () => {
    return { invoices: [], placeholder: true };
  });

  // Get bundle pricing
  app.post('/bundle-quote', async (request) => {
    const body = request.body as { domain: string; mailboxCount: number; provider?: string };
    return { domain: body.domain, quote: {}, placeholder: true };
  });
}
