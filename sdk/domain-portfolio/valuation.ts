/**
 * Domain valuation engine -- heuristic scoring based on multiple factors.
 */

import { DomainValuation, ValuationFactor } from '../types/domain-portfolio';

interface ValuationInput {
  domain: string;
  tld: string;
  domainAge?: number;
  domainLength?: number;
  domainAuthority?: number;
  backlinks?: number;
  referringDomains?: number;
  organicTraffic?: number;
  hasNumbers?: boolean;
  hasHyphens?: boolean;
  isKeywordDomain?: boolean;
  emailReputationScore?: number;
}

const TLD_MULTIPLIERS: Record<string, number> = {
  com: 1.0,
  net: 0.5,
  org: 0.45,
  io: 0.4,
  co: 0.35,
  ai: 0.6,
  app: 0.3,
  dev: 0.3,
};

export function valuateDomain(input: ValuationInput): DomainValuation {
  const factors: ValuationFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Domain length (shorter = more valuable)
  const length = input.domainLength ?? input.domain.split('.')[0].length;
  const lengthScore = length <= 3 ? 95 : length <= 5 ? 80 : length <= 8 ? 60 : length <= 12 ? 40 : 20;
  factors.push({ name: 'length', score: lengthScore, weight: 20, description: `${length} characters` });
  totalScore += lengthScore * 20;
  totalWeight += 20;

  // TLD value
  const tldMultiplier = TLD_MULTIPLIERS[input.tld] ?? 0.2;
  const tldScore = tldMultiplier * 100;
  factors.push({ name: 'tld', score: tldScore, weight: 15, description: `.${input.tld}` });
  totalScore += tldScore * 15;
  totalWeight += 15;

  // Domain age
  if (input.domainAge !== undefined) {
    const ageScore = Math.min(input.domainAge * 5, 100);
    factors.push({ name: 'age', score: ageScore, weight: 10, description: `${input.domainAge} years` });
    totalScore += ageScore * 10;
    totalWeight += 10;
  }

  // Domain authority
  if (input.domainAuthority !== undefined) {
    factors.push({ name: 'authority', score: input.domainAuthority, weight: 20, description: `DA ${input.domainAuthority}` });
    totalScore += input.domainAuthority * 20;
    totalWeight += 20;
  }

  // Backlinks
  if (input.backlinks !== undefined) {
    const blScore = Math.min(Math.log10(Math.max(input.backlinks, 1)) * 20, 100);
    factors.push({ name: 'backlinks', score: blScore, weight: 15, description: `${input.backlinks} backlinks` });
    totalScore += blScore * 15;
    totalWeight += 15;
  }

  // Traffic
  if (input.organicTraffic !== undefined && input.organicTraffic > 0) {
    const trafficScore = Math.min(Math.log10(input.organicTraffic) * 25, 100);
    factors.push({ name: 'traffic', score: trafficScore, weight: 10, description: `${input.organicTraffic} monthly visits` });
    totalScore += trafficScore * 10;
    totalWeight += 10;
  }

  // Penalties
  if (input.hasHyphens) {
    factors.push({ name: 'hyphens', score: -30, weight: 5, description: 'Contains hyphens' });
    totalScore -= 30 * 5;
    totalWeight += 5;
  }

  if (input.hasNumbers) {
    factors.push({ name: 'numbers', score: -15, weight: 5, description: 'Contains numbers' });
    totalScore -= 15 * 5;
    totalWeight += 5;
  }

  // Email reputation bonus (unique to this platform)
  if (input.emailReputationScore !== undefined && input.emailReputationScore > 0) {
    factors.push({ name: 'email_reputation', score: input.emailReputationScore, weight: 10, description: `Email reputation ${input.emailReputationScore}/100` });
    totalScore += input.emailReputationScore * 10;
    totalWeight += 10;
  }

  const normalizedScore = totalWeight > 0 ? Math.max(0, Math.min(100, totalScore / totalWeight)) : 0;

  // Convert score to dollar value (rough heuristic)
  const baseValue = scoreToValue(normalizedScore);

  return {
    domain: input.domain,
    estimatedValue: Math.round(baseValue * 100) / 100,
    confidence: normalizedScore > 70 ? 'high' : normalizedScore > 40 ? 'medium' : 'low',
    method: 'algorithm',
    factors,
    valuedAt: new Date(),
  };
}

function scoreToValue(score: number): number {
  // Exponential mapping: score 0-100 -> value $1 - $100,000+
  if (score >= 90) return 50000 + (score - 90) * 5000;
  if (score >= 70) return 5000 + (score - 70) * 2250;
  if (score >= 50) return 500 + (score - 50) * 225;
  if (score >= 30) return 50 + (score - 30) * 22.5;
  return Math.max(1, score * 1.67);
}
