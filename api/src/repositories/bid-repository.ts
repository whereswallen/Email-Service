import { Pool, PoolClient } from 'pg';
import { BaseRepository, toCamel, mapRows } from './base-repository';

export interface BidRow {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  maxBid: number | null;
  stripePaymentIntentId: string | null;
  isWinning: boolean;
  createdAt: Date;
}

export class BidRepository extends BaseRepository<BidRow> {
  constructor(pool: Pool) {
    super(pool, 'bids');
  }

  async findByAuction(auctionId: string): Promise<BidRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM bids WHERE auction_id = $1 ORDER BY created_at DESC',
      [auctionId]
    );
    return mapRows<BidRow>(result.rows);
  }

  async findWinning(auctionId: string): Promise<BidRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM bids WHERE auction_id = $1 AND is_winning = TRUE LIMIT 1',
      [auctionId]
    );
    return result.rows[0] ? toCamel<BidRow>(result.rows[0]) : null;
  }

  async createWithClient(client: PoolClient, data: Partial<BidRow>): Promise<BidRow> {
    const result = await client.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, max_bid, stripe_payment_intent_id, is_winning)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.auctionId, data.bidderId, data.amount, data.maxBid || null, data.stripePaymentIntentId || null, data.isWinning || false]
    );
    return toCamel<BidRow>(result.rows[0]);
  }

  async clearWinning(client: PoolClient, auctionId: string): Promise<void> {
    await client.query(
      'UPDATE bids SET is_winning = FALSE WHERE auction_id = $1 AND is_winning = TRUE',
      [auctionId]
    );
  }

  async markWinning(client: PoolClient, bidId: string): Promise<void> {
    await client.query('UPDATE bids SET is_winning = TRUE WHERE id = $1', [bidId]);
  }
}
