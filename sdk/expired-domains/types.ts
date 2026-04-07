/**
 * Expired domain pipeline types.
 */

export type CandidateStatus = 'discovered' | 'evaluated' | 'bidding' | 'acquired' | 'passed';
export type WarmingAdvantage = 'high' | 'medium' | 'low' | 'none';

export interface ExpiredDomainCandidate {
  domain: string;
  tld: string;
  dropDate: Date;
  domainAgeYears?: number;
  backlinks?: number;
  referringDomains?: number;
  domainAuthority?: number;
  organicTrafficEstimate?: number;

  // Scoring
  overallScore?: number;
  emailReputationScore?: number;
  spamBlacklisted?: boolean;
  suitableForMailcow?: boolean;
  warmingAdvantage?: WarmingAdvantage;

  // Pipeline state
  status: CandidateStatus;
  acquisitionBudget?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailReputationAssessment {
  domain: string;
  overallScore: number;

  // Blacklist checks
  blacklisted: boolean;
  blacklists: string[];

  // Email history
  hadMXRecords: boolean;
  hadSPFRecord: boolean;
  hadDKIMRecord: boolean;
  lastKnownMXProvider?: string;

  // Recommendation
  suitableForMailcow: boolean;
  warmingAdvantage: WarmingAdvantage;
  notes: string;
}
