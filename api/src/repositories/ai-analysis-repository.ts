/**
 * Repository for AI analysis results and usage tracking.
 */

import { Pool } from 'pg';
import { BaseRepository, toCamel, mapRows } from './base-repository';
import type { AIAnalysisRow, AIAnalysisType } from '../../../sdk/ai/types';

interface AIUsageRow {
  id: string;
  customerId: string;
  period: string;
  analysisType: string;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  updatedAt: Date;
}

export class AIAnalysisRepository extends BaseRepository<AIAnalysisRow> {
  constructor(pool: Pool) {
    super(pool, 'ai_analyses');
  }

  /**
   * Find cached analysis by input hash and type.
   */
  async findByHash(inputHash: string, analysisType: AIAnalysisType): Promise<AIAnalysisRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM ai_analyses
       WHERE input_hash = $1 AND analysis_type = $2
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 1`,
      [inputHash, analysisType]
    );
    return result.rows[0] ? toCamel<AIAnalysisRow>(result.rows[0]) : null;
  }

  /**
   * Find cached analysis for a specific domain and type.
   */
  async findByDomainAndType(domain: string, analysisType: AIAnalysisType): Promise<AIAnalysisRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM ai_analyses
       WHERE domain = $1 AND analysis_type = $2
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 1`,
      [domain, analysisType]
    );
    return result.rows[0] ? toCamel<AIAnalysisRow>(result.rows[0]) : null;
  }

  /**
   * Get AI analysis history for a customer.
   */
  async findByCustomer(customerId: string, limit = 50): Promise<AIAnalysisRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM ai_analyses WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [customerId, limit]
    );
    return mapRows<AIAnalysisRow>(result.rows);
  }

  /**
   * Record usage and update monthly rollup.
   */
  async trackUsage(
    customerId: string,
    analysisType: AIAnalysisType,
    inputTokens: number,
    outputTokens: number,
    costUsd: number
  ): Promise<void> {
    const period = new Date().toISOString().substring(0, 7); // '2026-04'
    await this.pool.query(
      `INSERT INTO ai_usage (customer_id, period, analysis_type, request_count, total_input_tokens, total_output_tokens, total_cost_usd)
       VALUES ($1, $2, $3, 1, $4, $5, $6)
       ON CONFLICT (customer_id, period, analysis_type)
       DO UPDATE SET
         request_count = ai_usage.request_count + 1,
         total_input_tokens = ai_usage.total_input_tokens + $4,
         total_output_tokens = ai_usage.total_output_tokens + $5,
         total_cost_usd = ai_usage.total_cost_usd + $6,
         updated_at = NOW()`,
      [customerId, period, analysisType, inputTokens, outputTokens, costUsd]
    );
  }

  /**
   * Get usage stats for a customer (current month or specified period).
   */
  async getUsage(customerId: string, period?: string): Promise<AIUsageRow[]> {
    const p = period ?? new Date().toISOString().substring(0, 7);
    const result = await this.pool.query(
      `SELECT * FROM ai_usage WHERE customer_id = $1 AND period = $2`,
      [customerId, p]
    );
    return mapRows<AIUsageRow>(result.rows);
  }

  /**
   * Get total requests this month for rate limiting.
   */
  async getMonthlyRequestCount(customerId: string): Promise<number> {
    const period = new Date().toISOString().substring(0, 7);
    const result = await this.pool.query(
      `SELECT COALESCE(SUM(request_count), 0) as total
       FROM ai_usage WHERE customer_id = $1 AND period = $2`,
      [customerId, period]
    );
    return parseInt(result.rows[0]?.total || '0', 10);
  }
}
