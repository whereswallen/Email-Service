/**
 * Expired domain scanner -- fetches new dropping domain candidates.
 */

import { Job } from 'bullmq';
import { ExpiredDomainServiceAPI } from '../../services/expired-domain-service';
import { getPool } from '../../lib/db';
import { scrapeExpiredDomains, ScrapeFilters } from '../../scrapers/expired-domains-net';

const DEFAULT_FILTERS: ScrapeFilters = {
  tlds: ['com', 'net', 'org'],
  minDA: 10,
  minBacklinks: 50,
  maxDaysUntilDrop: 7,
};

export async function processExpiredScanner(job: Job): Promise<void> {
  const service = new ExpiredDomainServiceAPI(getPool());
  const filters = (job.data?.filters as ScrapeFilters) || DEFAULT_FILTERS;

  console.log('Scanning for expired domain candidates...');

  try {
    const candidates = await scrapeExpiredDomains(filters);
    console.log(`Found ${candidates.length} candidates from scraper`);

    if (candidates.length > 0) {
      const added = await service.addCandidates(candidates);
      console.log(`Added ${added} candidates to pipeline`);
    }
  } catch (err) {
    console.error('Expired domain scan failed:', err);
    throw err;
  }
}
