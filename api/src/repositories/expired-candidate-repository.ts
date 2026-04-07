import { Pool } from 'pg';
import { BaseRepository, toCamel, mapRows } from './base-repository';

export interface ExpiredCandidateRow {
  id: string;
  domain: string;
  tld: string;
  dropDate: Date | null;
  domainAgeYears: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  domainAuthority: number | null;
  organicTrafficEstimate: number | null;
  emailReputationScore: number | null;
  spamBlacklisted: boolean;
  suitableForMailcow: boolean;
  warmingAdvantage: string;
  overallScore: number | null;
  status: string;
  acquisitionBudget: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ExpiredCandidateRepository extends BaseRepository<ExpiredCandidateRow> {
  constructor(pool: Pool) {
    super(pool, 'expired_domain_candidates');
  }

  async findByDomain(domain: string): Promise<ExpiredCandidateRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM expired_domain_candidates WHERE domain = $1',
      [domain]
    );
    return result.rows[0] ? toCamel<ExpiredCandidateRow>(result.rows[0]) : null;
  }

  async findByStatus(status: string): Promise<ExpiredCandidateRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM expired_domain_candidates WHERE status = $1 ORDER BY overall_score DESC NULLS LAST',
      [status]
    );
    return mapRows<ExpiredCandidateRow>(result.rows);
  }

  async findTopCandidates(limit: number = 20): Promise<ExpiredCandidateRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM expired_domain_candidates
       WHERE status = 'evaluated' AND spam_blacklisted = FALSE
       ORDER BY overall_score DESC NULLS LAST LIMIT $1`,
      [limit]
    );
    return mapRows<ExpiredCandidateRow>(result.rows);
  }

  async findMailcowCandidates(): Promise<ExpiredCandidateRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM expired_domain_candidates
       WHERE suitable_for_mailcow = TRUE AND warming_advantage = 'high'
       ORDER BY email_reputation_score DESC NULLS LAST`
    );
    return mapRows<ExpiredCandidateRow>(result.rows);
  }

  async upsert(data: Partial<ExpiredCandidateRow>): Promise<ExpiredCandidateRow> {
    const result = await this.pool.query(
      `INSERT INTO expired_domain_candidates (domain, tld, drop_date, domain_age_years, backlinks, referring_domains, domain_authority, organic_traffic_estimate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (domain) DO UPDATE SET
         drop_date = COALESCE(EXCLUDED.drop_date, expired_domain_candidates.drop_date),
         domain_age_years = COALESCE(EXCLUDED.domain_age_years, expired_domain_candidates.domain_age_years),
         backlinks = COALESCE(EXCLUDED.backlinks, expired_domain_candidates.backlinks),
         referring_domains = COALESCE(EXCLUDED.referring_domains, expired_domain_candidates.referring_domains),
         domain_authority = COALESCE(EXCLUDED.domain_authority, expired_domain_candidates.domain_authority),
         organic_traffic_estimate = COALESCE(EXCLUDED.organic_traffic_estimate, expired_domain_candidates.organic_traffic_estimate),
         updated_at = NOW()
       RETURNING *`,
      [data.domain, data.tld, data.dropDate, data.domainAgeYears, data.backlinks, data.referringDomains, data.domainAuthority, data.organicTrafficEstimate, data.status || 'discovered']
    );
    return toCamel<ExpiredCandidateRow>(result.rows[0]);
  }

  async updateScore(domain: string, overallScore: number, emailReputationScore: number, spamBlacklisted: boolean, suitableForMailcow: boolean, warmingAdvantage: string): Promise<void> {
    await this.pool.query(
      `UPDATE expired_domain_candidates SET
        overall_score = $2, email_reputation_score = $3, spam_blacklisted = $4,
        suitable_for_mailcow = $5, warming_advantage = $6, status = 'evaluated', updated_at = NOW()
       WHERE domain = $1`,
      [domain, overallScore, emailReputationScore, spamBlacklisted, suitableForMailcow, warmingAdvantage]
    );
  }
}
