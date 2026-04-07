/**
 * Billing routes.
 */

import { FastifyInstance } from 'fastify';
import { BillingServiceAPI } from '../services/billing-service';
import { getPool } from '../lib/db';

export default async function billingRoutes(app: FastifyInstance) {
  const service = new BillingServiceAPI(getPool());

  // Get customer subscriptions
  app.get('/subscriptions', { preHandler: [app.authenticate] }, async (request) => {
    return service.getSubscriptions(request.user.id);
  });

  // Get billing history
  app.get('/transactions', { preHandler: [app.authenticate] }, async (request) => {
    const { type } = request.query as { type?: string };
    return service.getTransactions(request.user.id, type);
  });
}
