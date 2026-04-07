import { Pool } from 'pg';
import { BaseRepository, toCamel, mapRows, PaginationOptions, PaginatedResult } from './base-repository';

export interface BillingSubscriptionRow {
  id: string;
  customerId: string;
  stripeSubscriptionId: string | null;
  type: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
}

export interface BillingTxRow {
  id: string;
  customerId: string;
  stripePaymentId: string | null;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  relatedDomainId: string | null;
  relatedAuctionId: string | null;
  createdAt: Date;
}

export class BillingRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createSubscription(data: Partial<BillingSubscriptionRow>): Promise<BillingSubscriptionRow> {
    const result = await this.pool.query(
      `INSERT INTO billing_subscriptions (customer_id, stripe_subscription_id, type, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.customerId, data.stripeSubscriptionId, data.type, data.status || 'active', data.currentPeriodStart, data.currentPeriodEnd]
    );
    return toCamel<BillingSubscriptionRow>(result.rows[0]);
  }

  async findSubscriptions(customerId: string): Promise<BillingSubscriptionRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM billing_subscriptions WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return mapRows<BillingSubscriptionRow>(result.rows);
  }

  async createTransaction(data: Partial<BillingTxRow>): Promise<BillingTxRow> {
    const result = await this.pool.query(
      `INSERT INTO billing_transactions (customer_id, stripe_payment_id, type, amount, currency, description, related_domain_id, related_auction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.customerId, data.stripePaymentId, data.type, data.amount, data.currency || 'USD', data.description, data.relatedDomainId, data.relatedAuctionId]
    );
    return toCamel<BillingTxRow>(result.rows[0]);
  }

  async findTransactions(customerId: string, type?: string): Promise<BillingTxRow[]> {
    if (type) {
      const result = await this.pool.query(
        'SELECT * FROM billing_transactions WHERE customer_id = $1 AND type = $2 ORDER BY created_at DESC',
        [customerId, type]
      );
      return mapRows<BillingTxRow>(result.rows);
    }
    const result = await this.pool.query(
      'SELECT * FROM billing_transactions WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return mapRows<BillingTxRow>(result.rows);
  }
}
