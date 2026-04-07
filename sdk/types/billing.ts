/**
 * Billing types.
 */

export type BillingTransactionType =
  | 'domain_registration'
  | 'domain_renewal'
  | 'email_subscription'
  | 'auction_purchase'
  | 'auction_sale'
  | 'bundle';

export type SubscriptionType = 'email' | 'domain_renewal' | 'bundle';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'paused';

export interface BillingSubscription {
  id: string;
  customerId: string;
  stripeSubscriptionId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}

export interface BillingTransaction {
  id: string;
  customerId: string;
  stripePaymentId?: string;
  type: BillingTransactionType;
  amount: number;
  currency: string;
  description: string;
  relatedDomainId?: string;
  relatedAuctionId?: string;
  createdAt: Date;
}

export interface EscrowHold {
  paymentIntentId: string;
  amount: number;
  bidderId: string;
  auctionId: string;
  status: 'held' | 'captured' | 'released';
  createdAt: Date;
}

export interface PayoutResult {
  transferId: string;
  sellerId: string;
  amount: number;
  platformFee: number;
  status: 'pending' | 'paid' | 'failed';
}

export interface InvoiceLineItem {
  description: string;
  type: BillingTransactionType;
  amount: number;
  quantity: number;
  relatedId?: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  stripeInvoiceId?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  total: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}
