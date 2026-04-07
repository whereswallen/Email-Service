/**
 * Webhook handlers for Stripe and registrar events.
 */

import { FastifyInstance } from 'fastify';
import { getConfig } from '../lib/config';

export default async function webhookRoutes(app: FastifyInstance) {
  // Stripe webhook
  app.post('/stripe', async (request, reply) => {
    const config = getConfig();
    const sig = request.headers['stripe-signature'] as string;

    if (!sig || !config.stripeWebhookSecret) {
      return reply.status(400).send({ error: 'Missing stripe signature' });
    }

    // In production, verify signature:
    // const stripe = getStripe();
    // const event = stripe.webhooks.constructEvent(rawBody, sig, config.stripeWebhookSecret);

    const body = request.body as Record<string, unknown>;
    const eventType = body.type as string;

    switch (eventType) {
      case 'payment_intent.succeeded':
        // Auction bid captured or domain registration paid
        app.log.info({ eventType, id: (body.data as any)?.object?.id }, 'Payment succeeded');
        break;

      case 'payment_intent.canceled':
        // Bid hold released
        app.log.info({ eventType }, 'Payment intent canceled');
        break;

      case 'invoice.paid':
        app.log.info({ eventType }, 'Invoice paid');
        break;

      case 'invoice.payment_failed':
        app.log.warn({ eventType }, 'Invoice payment failed');
        break;

      case 'customer.subscription.deleted':
        app.log.info({ eventType }, 'Subscription cancelled');
        break;

      default:
        app.log.debug({ eventType }, 'Unhandled Stripe event');
    }

    return { received: true };
  });

  // OpenSRS webhook for domain events
  app.post('/opensrs', async (request) => {
    const body = request.body as Record<string, unknown>;
    app.log.info({ action: body.action }, 'OpenSRS webhook received');
    return { received: true };
  });
}
