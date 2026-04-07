import { Pool } from 'pg';
import { BaseRepository, toCamel, mapRows } from './base-repository';

export interface OfferRow {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number;
  status: string;
  counterAmount: number | null;
  message: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export class OfferRepository extends BaseRepository<OfferRow> {
  constructor(pool: Pool) {
    super(pool, 'offers');
  }

  async findByListing(listingId: string): Promise<OfferRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM offers WHERE listing_id = $1 ORDER BY created_at DESC',
      [listingId]
    );
    return mapRows<OfferRow>(result.rows);
  }

  async findByBuyer(buyerId: string): Promise<OfferRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM offers WHERE buyer_id = $1 ORDER BY created_at DESC',
      [buyerId]
    );
    return mapRows<OfferRow>(result.rows);
  }

  async updateStatus(id: string, status: string, counterAmount?: number): Promise<void> {
    if (counterAmount !== undefined) {
      await this.pool.query(
        'UPDATE offers SET status = $2, counter_amount = $3 WHERE id = $1',
        [id, status, counterAmount]
      );
    } else {
      await this.pool.query('UPDATE offers SET status = $2 WHERE id = $1', [id, status]);
    }
  }
}
