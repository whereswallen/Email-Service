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

  async getAnalytics(customerId?: string): Promise<{
    totalDomains: number;
    totalInvested: number;
    totalEstimatedValue: number;
    annualRenewalBurn: number;
    unrealizedPnL: number;
    roiPercent: number;
    expiringIn30Days: number;
    expiringIn60Days: number;
    expiringIn90Days: number;
    byPurpose: Record<string, number>;
    byTld: Record<string, number>;
  }> {
    const where = customerId
      ? 'JOIN domains d ON pe.domain_id = d.id WHERE d.customer_id = $1'
      : '';
    const params = customerId ? [customerId] : [];

    const result = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total_domains,
        COALESCE(SUM(pe.acquisition_cost), 0)::float AS total_invested,
        COALESCE(SUM(pe.estimated_value), 0)::float AS total_estimated_value,
        COALESCE(SUM(pe.annual_renewal_cost), 0)::float AS annual_renewal_burn
      FROM portfolio_entries pe ${where}
    `, params);

    const row = result.rows[0];
    const totalInvested = parseFloat(row.total_invested) || 0;
    const totalEstimatedValue = parseFloat(row.total_estimated_value) || 0;
    const unrealizedPnL = totalEstimatedValue - totalInvested;
    const roiPercent = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

    return {
      totalDomains: parseInt(row.total_domains) || 0,
      totalInvested,
      totalEstimatedValue,
      annualRenewalBurn: parseFloat(row.annual_renewal_burn) || 0,
      unrealizedPnL,
      roiPercent,
      expiringIn30Days: 0,
      expiringIn60Days: 0,
      expiringIn90Days: 0,
      byPurpose: {},
      byTld: {},
    };
  }

  async getTopByValue(customerId: string, limit: number = 20): Promise<PortfolioEntryRow[]> {
    const result = await this.pool.query(
      `SELECT pe.* FROM portfolio_entries pe
       JOIN domains d ON pe.domain_id = d.id
       WHERE d.customer_id = $1
       ORDER BY pe.estimated_value DESC NULLS LAST LIMIT $2`,
      [customerId, limit]
    );
    return mapRows<PortfolioEntryRow>(result.rows);
  }

  async getExpiring(customerId: string, days: number = 90): Promise<PortfolioEntryRow[]> {
    const result = await this.pool.query(
      `SELECT pe.* FROM portfolio_entries pe
       JOIN domains d ON pe.domain_id = d.id
       WHERE d.customer_id = $1 AND d.expires_at <= NOW() + INTERVAL '1 day' * $2
       ORDER BY d.expires_at ASC`,
      [customerId, days]
    );
    return mapRows<PortfolioEntryRow>(result.rows);
  }
}
