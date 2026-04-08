/**
 * AI response caching utilities.
 * Defines cache key builders and TTL constants per analysis type.
 */

import { createHash } from 'crypto';
import type { AIAnalysisType } from './types';

// Cache TTLs in seconds
export const CACHE_TTLS: Record<AIAnalysisType, number> = {
  valuation: 7 * 24 * 60 * 60,        // 7 days
  discovery: 24 * 60 * 60,            // 24 hours
  auction_advice: 60 * 60,            // 1 hour (auctions are time-sensitive)
  landing_page: 30 * 24 * 60 * 60,   // 30 days
  outbound_email: 0,                  // Never cached (always unique)
  portfolio_query: 60 * 60,           // 1 hour
  name_generation: 0,                 // Never cached
};

/**
 * Build a Redis cache key for an AI analysis.
 */
export function buildCacheKey(type: AIAnalysisType, ...parts: string[]): string {
  return `helix:ai:${type}:${parts.join(':')}`;
}

/**
 * Hash input data to create a cache dedup key.
 * Same inputs = same hash = cache hit even if requested at different times.
 */
export function hashInput(data: unknown): string {
  const serialized = JSON.stringify(data, Object.keys(data as Record<string, unknown>).sort());
  return createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

/**
 * Check if an analysis type should use caching.
 */
export function shouldCache(type: AIAnalysisType): boolean {
  return CACHE_TTLS[type] > 0;
}

/**
 * Convert DB expires_at timestamp for a given analysis type.
 */
export function getExpiresAt(type: AIAnalysisType): Date | null {
  const ttl = CACHE_TTLS[type];
  if (ttl <= 0) return null;
  return new Date(Date.now() + ttl * 1000);
}
