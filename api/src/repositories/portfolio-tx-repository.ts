import { Pool } from 'pg';
import { BaseRepository, mapRows } from './base-repository';

export interface PortfolioTxRow {
  id: string;
  domainId: string;
  type: string;
  amount: number;
  counterparty: string | null;
  stripePaymentId: string | null;
  transactionDate: Date;
  notes: string | null;
}

export class PortfolioTxRepository extends BaseRepository<PortfolioTxRow> {
  constructor(pool: Pool) {
    super(pool, 'portfolio_transactions');
  }

  async findByDomain(domainId: string): Promise<PortfolioTxRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM portfolio_transactions WHERE domain_id = $1 ORDER BY transaction_date DESC',
      [domainId]
    );
    return mapRows<PortfolioTxRow>(result.rows);
  }
}
