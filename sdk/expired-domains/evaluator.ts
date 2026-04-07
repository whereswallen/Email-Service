/**
 * Expired domain evaluator -- scores domains based on SEO, age, and keyword quality.
 */

import { ExpiredDomainCandidate } from './types';

export interface EvaluationResult {
  domain: string;
  overallScore: number;
  factors: { name: string; score: number; weight: number }[];
}

export function evaluateDomain(candidate: ExpiredDomainCandidate): EvaluationResult {
  const factors: { name: string; score: number; weight: number }[] = [];

  // Domain authority (0-100, weight 25)
  const daScore = candidate.domainAuthority ?? 0;
  factors.push({ name: 'domain_authority', score: daScore, weight: 25 });

  // Backlinks (log scale, weight 20)
  const blScore = candidate.backlinks
    ? Math.min(Math.log10(Math.max(candidate.backlinks, 1)) * 20, 100)
    : 0;
  factors.push({ name: 'backlinks', score: blScore, weight: 20 });

  // Referring domains (log scale, weight 15)
  const rdScore = candidate.referringDomains
    ? Math.min(Math.log10(Math.max(candidate.referringDomains, 1)) * 25, 100)
    : 0;
  factors.push({ name: 'referring_domains', score: rdScore, weight: 15 });

  // Domain age (weight 15)
  const ageScore = candidate.domainAgeYears
    ? Math.min(candidate.domainAgeYears * 5, 100)
    : 0;
  factors.push({ name: 'age', score: ageScore, weight: 15 });

  // Domain length (weight 10)
  const name = candidate.domain.split('.')[0];
  const lengthScore = name.length <= 3 ? 95 : name.length <= 5 ? 80 : name.length <= 8 ? 60 : name.length <= 12 ? 40 : 20;
  factors.push({ name: 'length', score: lengthScore, weight: 10 });

  // TLD (weight 10)
  const tldScores: Record<string, number> = { com: 100, net: 55, org: 50, io: 45, ai: 60, co: 40 };
  const tldScore = tldScores[candidate.tld] ?? 20;
  factors.push({ name: 'tld', score: tldScore, weight: 10 });

  // Organic traffic (weight 5)
  const trafficScore = candidate.organicTrafficEstimate
    ? Math.min(Math.log10(Math.max(candidate.organicTrafficEstimate, 1)) * 25, 100)
    : 0;
  factors.push({ name: 'traffic', score: trafficScore, weight: 5 });

  // Calculate weighted average
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const overallScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight
  );

  return {
    domain: candidate.domain,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    factors,
  };
}
