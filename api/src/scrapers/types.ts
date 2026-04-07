/**
 * Scraper interface for expired domain data sources.
 */

export interface ScraperCandidate {
  domain: string;
  tld: string;
  dropDate?: Date;
  domainAgeYears?: number;
  backlinks?: number;
  referringDomains?: number;
  domainAuthority?: number;
  organicTrafficEstimate?: number;
}

export interface ScraperProvider {
  name: string;
  discoverCandidates(filters: Record<string, unknown>): Promise<ScraperCandidate[]>;
}
