import { Pool, PoolClient } from 'pg';
import { BaseRepository, toCamel, mapRows, PaginationOptions, PaginatedResult } from './base-repository';

export interface AuctionRow {
  id: string;
  domainId: string;
  sellerId: string;
  type: string;
  status: string;
  startingPrice: number | null;
  reservePrice: number | null;
  buyNowPrice: number | null;
  currentBid: number | null;
  bidCount: number;
  minimumIncrement: number;
  startsAt: Date | null;
  endsAt: Date | null;
  autoExtend: boolean;
  autoExtendMinutes: number;
  winnerId: string | null;
  platformFeePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AuctionRepository extends BaseRepository<AuctionRow> {
  constructor(pool: Pool) {
    super(pool, 'auction_listings');
  }

  async findActive(pagination: PaginationOptions): Promise<PaginatedResult<AuctionRow>> {
    return this.paginate(
      `SELECT * FROM auction_listings WHERE status = 'active' ORDER BY ends_at ASC`,
      `SELECT COUNT(*) FROM auction_listings WHERE status = 'active'`,
      [],
      pagination
    );
  }

  async findByStatus(status: string): Promise<AuctionRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM auction_listings WHERE status = $1 ORDER BY ends_at ASC',
      [status]
    );
    return mapRows<AuctionRow>(result.rows);
  }

  async findBySeller(sellerId: string): Promise<AuctionRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM auction_listings WHERE seller_id = $1 ORDER BY created_at DESC',
      [sellerId]
    );
    return mapRows<AuctionRow>(result.rows);
  }

  async findEndingSoon(minutes: number): Promise<AuctionRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM auction_listings WHERE status = 'active' AND ends_at <= NOW() + INTERVAL '1 minute' * $1 ORDER BY ends_at ASC`,
      [minutes]
    );
    return mapRows<AuctionRow>(result.rows);
  }

  async findExpiredActive(): Promise<AuctionRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM auction_listings WHERE status = 'active' AND ends_at <= NOW()`
    );
    return mapRows<AuctionRow>(result.rows);
  }

  /**
   * Lock an auction row for update within a transaction.
   */
  async findByIdForUpdate(client: PoolClient, id: string): Promise<AuctionRow | null> {
    const result = await client.query(
      'SELECT * FROM auction_listings WHERE id = $1 FOR UPDATE',
      [id]
    );
    return result.rows[0] ? toCamel<AuctionRow>(result.rows[0]) : null;
  }

  async updateBid(client: PoolClient, id: string, currentBid: number, bidCount: number, endsAt?: Date): Promise<void> {
    if (endsAt) {
      await client.query(
        'UPDATE auction_listings SET current_bid = $2, bid_count = $3, ends_at = $4, updated_at = NOW() WHERE id = $1',
        [id, currentBid, bidCount, endsAt]
      );
    } else {
      await client.query(
        'UPDATE auction_listings SET current_bid = $2, bid_count = $3, updated_at = NOW() WHERE id = $1',
        [id, currentBid, bidCount]
      );
    }
  }
}
