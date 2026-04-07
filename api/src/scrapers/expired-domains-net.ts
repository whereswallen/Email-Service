/**
 * ExpiredDomains.net scraper -- discovers dropping domain candidates.
 *
 * Fetches domain lists with filters and parses into candidate objects.
 * Rate-limited to avoid being blocked (1 request per 5 seconds).
 */

import * as https from 'https';
import { ScraperCandidate } from './types';

export interface ScrapeFilters {
  tlds?: string[];
  minDA?: number;
  minBacklinks?: number;
  maxDaysUntilDrop?: number;
  minDomainAge?: number;
  maxResults?: number;
}

/**
 * Scrape ExpiredDomains.net for dropping domain candidates.
 *
 * Note: ExpiredDomains.net requires authentication for full access.
 * This implementation provides the scraper structure; actual HTML parsing
 * depends on the site's current layout.
 */
export async function scrapeExpiredDomains(filters: ScrapeFilters): Promise<Partial<ScraperCandidate>[]> {
  const candidates: Partial<ScraperCandidate>[] = [];
  const tlds = filters.tlds || ['com'];
  const maxResults = filters.maxResults || 100;

  for (const tld of tlds) {
    try {
      const url = buildSearchUrl(tld, filters);
      const html = await fetchWithRateLimit(url);
      const parsed = parseDropList(html, tld, filters);
      candidates.push(...parsed);

      if (candidates.length >= maxResults) break;
    } catch (err) {
      console.error(`Failed to scrape .${tld} domains:`, err);
    }
  }

  return candidates.slice(0, maxResults);
}

function buildSearchUrl(tld: string, filters: ScrapeFilters): string {
  const params = new URLSearchParams({
    ftlds: tld,
    fwhois: '22', // Deleted domains
    fstatbl: filters.minBacklinks?.toString() || '0',
    fstabr: filters.minDA?.toString() || '0',
  });

  return `https://www.expireddomains.net/deleted-domains/?${params.toString()}`;
}

function parseDropList(html: string, tld: string, filters: ScrapeFilters): Partial<ScraperCandidate>[] {
  const candidates: Partial<ScraperCandidate>[] = [];

  // Parse table rows from the HTML
  // ExpiredDomains.net uses a table with class "base1"
  const rowRegex = /<tr[^>]*class="[^"]*base[12][^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cells: string[] = [];

    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags from cell content
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    if (cells.length >= 5) {
      const domain = cells[0];
      const backlinks = parseInt(cells[1], 10) || 0;
      const domainAuthority = parseInt(cells[2], 10) || 0;
      const referringDomains = parseInt(cells[3], 10) || 0;
      const ageStr = cells[4];
      const domainAgeYears = parseInt(ageStr, 10) || undefined;

      // Apply filters
      if (filters.minDA && domainAuthority < filters.minDA) continue;
      if (filters.minBacklinks && backlinks < filters.minBacklinks) continue;
      if (filters.minDomainAge && domainAgeYears && domainAgeYears < filters.minDomainAge) continue;

      if (domain && domain.includes('.')) {
        candidates.push({
          domain,
          tld,
          backlinks,
          domainAuthority,
          referringDomains,
          domainAgeYears,
        });
      }
    }
  }

  return candidates;
}

/**
 * Fetch URL with rate limiting (5 second delay between requests).
 */
let lastRequestTime = 0;
const RATE_LIMIT_MS = 5000;

async function fetchWithRateLimit(url: string): Promise<string> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }

  lastRequestTime = Date.now();

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DomainInvestor/1.0)',
        'Accept': 'text/html',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
