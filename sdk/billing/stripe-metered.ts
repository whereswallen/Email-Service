/**
 * Stripe metered billing for per-mailbox pricing.
 *
 * Handles:
 * - Creating subscriptions with metered email add-on
 * - Reporting usage (mailbox count changes)
 * - Webhook handling for payment events
 */

// TODO: Install stripe: npm install stripe
// import Stripe from 'stripe';

export interface BillingConfig {
  stripeSecretKey: string;
  emailPriceId: string; // Stripe Price ID for per-mailbox metered billing
}

/**
 * Report a mailbox addition to Stripe (increment usage).
 */
export async function reportMailboxAdded(
  config: BillingConfig,
  subscriptionItemId: string
): Promise<void> {
  // TODO: Implement with Stripe SDK
  // await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  //   quantity: 1,
  //   action: 'increment',
  //   timestamp: Math.floor(Date.now() / 1000),
  // });
  throw new Error('Not implemented — requires Stripe API key');
}

/**
 * Report a mailbox removal to Stripe (decrement usage).
 */
export async function reportMailboxRemoved(
  config: BillingConfig,
  subscriptionItemId: string
): Promise<void> {
  // TODO: Implement with Stripe SDK
  throw new Error('Not implemented — requires Stripe API key');
}

/**
 * Create a new email subscription for a customer.
 * Used when a standalone customer or VNDR Hub user enables email.
 */
export async function createEmailSubscription(
  config: BillingConfig,
  stripeCustomerId: string,
  initialMailboxCount: number = 1
): Promise<{ subscriptionId: string; subscriptionItemId: string }> {
  // TODO: Implement with Stripe SDK
  throw new Error('Not implemented — requires Stripe API key');
}
