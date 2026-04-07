/**
 * Webhook handlers for Stripe and registrar events.
 */

import { FastifyInstance } from 'fastify';

export default async function webhookRoutes(app: FastifyInstance) {
  // Stripe webhook
  app.post('/stripe', {
    config: { rawBody: true },
  }, async (request) => {
    // TODO: Verify Stripe signature
    // const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    const body = request.body as Record<string, unknown>;
    const eventType = body.type as string;

    switch (eventType) {
      case 'invoice.paid':
        // Handle successful payment
        break;
      case 'invoice.payment_failed':
        // Handle failed payment
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break;
      case 'payment_intent.succeeded':
        // Handle auction payment capture
        break;
    }

    return { received: true };
  });

  // OpenSRS domain event webhook
  app.post('/opensrs', async (request) => {
    const body = request.body as Record<string, unknown>;
    // Handle domain transfer completion, expiry notifications, etc.
    return { received: true };
  });
}
