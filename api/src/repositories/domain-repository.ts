import { Pool } from 'pg';
import { BaseRepository, toCamel, mapRows, PaginationOptions, PaginatedResult } from './base-repository';

export interface DomainRow {
  id: string;
  customerId: string | null;
  domain: string;
  tld: string;
  registrar: string;
  registrarDomainId: string | null;
  status: string;
  registeredAt: Date | null;
  expiresAt: Date | null;
  autoRenew: boolean;
  nameservers: string[] | null;
  whoisPrivacy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DomainRepository extends BaseRepository<DomainRow> {
  constructor(pool: Pool) {
    super(pool, 'domains');
  }

  async findByDomain(domain: string): Promise<DomainRow | null> {
    const result = await this.pool.query('SELECT * FROM domains WHERE domain = $1', [domain]);
    return result.rows[0] ? toCamel<DomainRow>(result.rows[0]) : null;
  }

  async findByCustomer(customerId: string, pagination: PaginationOptions): Promise<PaginatedResult<DomainRow>> {
    return this.paginate(
      'SELECT * FROM domains WHERE customer_id = $1 ORDER BY created_at DESC',
      'SELECT COUNT(*) FROM domains WHERE customer_id = $1',
      [customerId],
      pagination
    );
  }

  async findExpiring(days: number): Promise<DomainRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM domains WHERE expires_at <= NOW() + INTERVAL '1 day' * $1 AND status = 'active' ORDER BY expires_at ASC`,
      [days]
    );
    return mapRows<DomainRow>(result.rows);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.pool.query(
      'UPDATE domains SET status = $2, updated_at = NOW() WHERE id = $1',
      [id, status]
    );
  }
}
