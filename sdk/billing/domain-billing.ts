/**
 * Domain registration and renewal billing via Stripe.
 */

export interface DomainBillingConfig {
  stripeSecretKey: string;
}

/**
 * Charge for a domain registration.
 */
export async function chargeDomainRegistration(
  config: DomainBillingConfig,
  stripeCustomerId: string,
  domain: string,
  amount: number,
  years: number
): Promise<{ paymentIntentId: string; success: boolean }> {
  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // const pi = await stripe.paymentIntents.create({
  //   amount: Math.round(amount * 100),
  //   currency: 'usd',
  //   customer: stripeCustomerId,
  //   description: `Domain registration: ${domain} (${years} year${years > 1 ? 's' : ''})`,
  //   metadata: { domain, years: String(years), type: 'domain_registration' },
  // });

  return {
    paymentIntentId: `pi_reg_${Date.now()}`,
    success: true,
  };
}

/**
 * Create an annual renewal subscription for domains.
 */
export async function createRenewalSubscription(
  config: DomainBillingConfig,
  stripeCustomerId: string,
  domains: string[],
  annualAmount: number
): Promise<{ subscriptionId: string; success: boolean }> {
  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // const subscription = await stripe.subscriptions.create({
  //   customer: stripeCustomerId,
  //   items: [{ price: priceId }],
  //   billing_cycle_anchor: renewalDate,
  //   metadata: { domains: domains.join(','), type: 'domain_renewal' },
  // });

  return {
    subscriptionId: `sub_renewal_${Date.now()}`,
    success: true,
  };
}
