/**
 * Stripe client singleton.
 */

import Stripe from 'stripe';
import { getConfig } from './config';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const config = getConfig();
    if (!config.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required for payment operations');
    }
    _stripe = new Stripe(config.stripeSecretKey);
  }
  return _stripe;
}
