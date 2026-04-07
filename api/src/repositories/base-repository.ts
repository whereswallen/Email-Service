/**
 * Base repository with snake_case <-> camelCase mapping and common CRUD patterns.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// snake_case -> camelCase
export function toCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

// camelCase -> snake_case
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => toCamel<T>(row));
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T> {
  protected pool: Pool;
  protected tableName: string;

  constructor(pool: Pool, tableName: string) {
    this.pool = pool;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? toCamel<T>(result.rows[0]) : null;
  }

  async create(data: Partial<T>): Promise<T> {
    const snakeData = toSnake(data as Record<string, unknown>);
    const keys = Object.keys(snakeData);
    const values = Object.values(snakeData);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const result = await this.pool.query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    return toCamel<T>(result.rows[0]);
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const snakeData = toSnake(data as Record<string, unknown>);
    delete snakeData.id;
    delete snakeData.created_at;
    snakeData.updated_at = new Date();

    const keys = Object.keys(snakeData);
    if (keys.length === 0) return this.findById(id);

    const setClauses = keys.map((key, i) => `${key} = $${i + 2}`);
    const values = Object.values(snakeData);

    const result = await this.pool.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] ? toCamel<T>(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  protected async paginate(
    baseQuery: string,
    countQuery: string,
    params: unknown[],
    pagination: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(`${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pagination.limit, offset]),
      this.pool.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    return {
      data: mapRows<T>(dataResult.rows),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Execute a query within an existing transaction client.
   */
  protected async queryWithClient<R extends QueryResultRow = Record<string, unknown>>(
    client: PoolClient,
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<R>> {
    return client.query<R>(text, params);
  }
}
