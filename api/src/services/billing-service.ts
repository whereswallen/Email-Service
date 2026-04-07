/**
 * Billing service -- Stripe integration for domain registration, auctions, and invoicing.
 */

import { Pool } from 'pg';
import { BillingRepository, BillingTxRow } from '../repositories/billing-repository';
import { getStripe } from '../lib/stripe';
import { ExternalServiceError } from '../lib/errors';

export class BillingServiceAPI {
  private repo: BillingRepository;

  constructor(pool: Pool) {
    this.repo = new BillingRepository(pool);
  }

  /**
   * Charge for a domain registration.
   */
  async chargeDomainRegistration(
    customerId: string,
    stripeCustomerId: string,
    domain: string,
    amount: number,
    years: number
  ): Promise<BillingTxRow> {
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        description: `Domain registration: ${domain} (${years} year${years > 1 ? 's' : ''})`,
        metadata: { domain, years: String(years), type: 'domain_registration' },
        automatic_payment_methods: { enabled: true },
      });

      return this.repo.createTransaction({
        customerId,
        stripePaymentId: paymentIntent.id,
        type: 'domain_registration',
        amount,
        description: `Domain registration: ${domain} (${years}yr)`,
      });
    } catch (err) {
      throw new ExternalServiceError('Stripe', String(err));
    }
  }

  /**
   * Create a payment hold for an auction bid (manual capture).
   */
  async createBidHold(
    bidderId: string,
    stripeCustomerId: string,
    amount: number,
    auctionId: string
  ): Promise<string> {
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        capture_method: 'manual',
        metadata: { auctionId, type: 'auction_bid' },
        automatic_payment_methods: { enabled: true },
      });

      return paymentIntent.id;
    } catch (err) {
      throw new ExternalServiceError('Stripe', String(err));
    }
  }

  /**
   * Capture the winning bid's payment.
   */
  async captureWinningBid(
    paymentIntentId: string,
    finalAmount: number,
    platformFeePercent: number
  ): Promise<{ capturedAmount: number; platformFee: number }> {
    const platformFee = Math.round(finalAmount * (platformFeePercent / 100) * 100) / 100;

    try {
      const stripe = getStripe();
      await stripe.paymentIntents.capture(paymentIntentId, {
        amount_to_capture: Math.round(finalAmount * 100),
      });

      return { capturedAmount: finalAmount, platformFee };
    } catch (err) {
      throw new ExternalServiceError('Stripe', String(err));
    }
  }

  /**
   * Release funds to seller via Stripe Connect transfer.
   */
  async releaseFundsToSeller(
    sellerConnectAccountId: string,
    amount: number,
    platformFee: number
  ): Promise<string> {
    const sellerPayout = amount - platformFee;

    try {
      const stripe = getStripe();
      const transfer = await stripe.transfers.create({
        amount: Math.round(sellerPayout * 100),
        currency: 'usd',
        destination: sellerConnectAccountId,
      });

      return transfer.id;
    } catch (err) {
      throw new ExternalServiceError('Stripe', String(err));
    }
  }

  /**
   * Release a payment hold (losing bidder or cancelled auction).
   */
  async releaseHold(paymentIntentId: string): Promise<void> {
    try {
      const stripe = getStripe();
      await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (err) {
      throw new ExternalServiceError('Stripe', String(err));
    }
  }

  /**
   * Get billing transactions for a customer.
   */
  async getTransactions(customerId: string, type?: string): Promise<BillingTxRow[]> {
    return this.repo.findTransactions(customerId, type);
  }

  /**
   * Get subscriptions for a customer.
   */
  async getSubscriptions(customerId: string) {
    return this.repo.findSubscriptions(customerId);
  }
}
