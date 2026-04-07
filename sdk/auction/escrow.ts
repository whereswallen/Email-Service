/**
 * Auction escrow -- Stripe payment holds for bids and settlement payouts.
 */

import { EscrowHold, PayoutResult } from '../types/billing';

export interface EscrowConfig {
  stripeSecretKey: string;
}

/**
 * Create a payment hold for a bid (Stripe PaymentIntent with manual capture).
 */
export async function createBidHold(
  config: EscrowConfig,
  bidderId: string,
  amount: number,
  auctionId: string
): Promise<EscrowHold> {
  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // const paymentIntent = await stripe.paymentIntents.create({
  //   amount: Math.round(amount * 100),
  //   currency: 'usd',
  //   capture_method: 'manual',
  //   customer: bidderId,
  //   metadata: { auctionId },
  // });

  return {
    paymentIntentId: `pi_placeholder_${Date.now()}`,
    amount,
    bidderId,
    auctionId,
    status: 'held',
    createdAt: new Date(),
  };
}

/**
 * Capture the winning bid's payment hold.
 */
export async function captureWinningBid(
  config: EscrowConfig,
  paymentIntentId: string,
  finalAmount: number,
  platformFeePercent: number
): Promise<{ capturedAmount: number; platformFee: number }> {
  const platformFee = Math.round(finalAmount * (platformFeePercent / 100) * 100) / 100;

  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // await stripe.paymentIntents.capture(paymentIntentId, {
  //   amount_to_capture: Math.round(finalAmount * 100),
  //   application_fee_amount: Math.round(platformFee * 100),
  // });

  return { capturedAmount: finalAmount, platformFee };
}

/**
 * Release funds to the seller after domain transfer confirmation.
 */
export async function releaseFundsToSeller(
  config: EscrowConfig,
  sellerId: string,
  amount: number,
  platformFee: number
): Promise<PayoutResult> {
  const sellerPayout = amount - platformFee;

  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // const transfer = await stripe.transfers.create({
  //   amount: Math.round(sellerPayout * 100),
  //   currency: 'usd',
  //   destination: sellerId, // Stripe Connect account
  // });

  return {
    transferId: `tr_placeholder_${Date.now()}`,
    sellerId,
    amount: sellerPayout,
    platformFee,
    status: 'pending',
  };
}

/**
 * Release a payment hold (losing bidder or cancelled auction).
 */
export async function releaseHold(
  config: EscrowConfig,
  paymentIntentId: string
): Promise<void> {
  // TODO: Implement with Stripe SDK
  // const stripe = new Stripe(config.stripeSecretKey);
  // await stripe.paymentIntents.cancel(paymentIntentId);
}
