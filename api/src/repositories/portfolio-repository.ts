import { Pool } from 'pg';
import { BaseRepository, toCamel, mapRows, PaginationOptions, PaginatedResult } from './base-repository';

export interface PortfolioEntryRow {
  id: string;
  domainId: string;
  purpose: string;
  acquisitionCost: number | null;
  acquisitionMethod: string | null;
  annualRenewalCost: number | null;
  estimatedValue: number | null;
  valuationMethod: string | null;
  valuationDate: Date | null;
  domainAuthority: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  emailReputationScore: number | null;
  spamBlacklisted: boolean;
  listedForSale: boolean;
  salePrice: number | null;
  tags: string[] | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioFilter {
  purpose?: string;
  tld?: string;
  listedForSale?: boolean;
  minValue?: number;
  maxValue?: number;
}

export class PortfolioRepository extends BaseRepository<PortfolioEntryRow> {
  constructor(pool: Pool) {
    super(pool, 'portfolio_entries');
  }

  async findByDomainId(domainId: string): Promise<PortfolioEntryRow | null> {
    const result = await this.pool.query('SELECT * FROM portfolio_entries WHERE domain_id = $1', [domainId]);
    return result.rows[0] ? toCamel<PortfolioEntryRow>(result.rows[0]) : null;
  }

  async findAll(filter: PortfolioFilter, pagination: PaginationOptions): Promise<PaginatedResult<PortfolioEntryRow>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter.purpose) { conditions.push(`pe.purpose = $${paramIdx++}`); params.push(filter.purpose); }
    if (filter.listedForSale !== undefined) { conditions.push(`pe.listed_for_sale = $${paramIdx++}`); params.push(filter.listedForSale); }
    if (filter.tld) { conditions.push(`d.tld = $${paramIdx++}`); params.push(filter.tld); }
    if (filter.minValue) { conditions.push(`pe.estimated_value >= $${paramIdx++}`); params.push(filter.minValue); }
    if (filter.maxValue) { conditions.push(`pe.estimated_value <= $${paramIdx++}`); params.push(filter.maxValue); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.paginate(
      `SELECT pe.* FROM portfolio_entries pe JOIN domains d ON pe.domain_id = d.id ${where} ORDER BY pe.created_at DESC`,
      `SELECT COUNT(*) FROM portfolio_entries pe JOIN domains d ON pe.domain_id = d.id ${where}`,
      params,
      pagination
    );
  }

  async getAnalytics(): Promise<{
    totalDomains: number;
    totalInvested: number;
    totalEstimatedValue: number;
    annualRenewalBurn: number;
  }> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total_domains,
        COALESCE(SUM(acquisition_cost), 0)::float AS total_invested,
        COALESCE(SUM(estimated_value), 0)::float AS total_estimated_value,
        COALESCE(SUM(annual_renewal_cost), 0)::float AS annual_renewal_burn
      FROM portfolio_entries
    `);
    return toCamel(result.rows[0]);
  }
}
