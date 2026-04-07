/**
 * Reputation transfer -- use expired domains with email history to accelerate Mailcow IP warming.
 */

import { EmailReputationAssessment } from '../expired-domains/types';
import { EmailProvider } from '../providers/email/interface';

export interface ReputationTransferResult {
  domain: string;
  warmingAdvantage: string;
  provisionedOnMailcow: boolean;
  estimatedWarmupWeeks: number;
  notes: string;
}

/**
 * Assess whether an expired domain should be configured on Mailcow for reputation transfer.
 */
export function assessReputationTransfer(
  reputation: EmailReputationAssessment
): { recommended: boolean; reason: string; estimatedWarmupWeeks: number } {
  if (reputation.blacklisted) {
    return { recommended: false, reason: 'Domain is blacklisted', estimatedWarmupWeeks: 8 };
  }

  if (reputation.warmingAdvantage === 'high') {
    return {
      recommended: true,
      reason: 'Domain has full email reputation (MX + SPF + DKIM) -- configure on Mailcow first',
      estimatedWarmupWeeks: 1,
    };
  }

  if (reputation.warmingAdvantage === 'medium') {
    return {
      recommended: true,
      reason: 'Domain has partial email reputation -- reduced warm-up period',
      estimatedWarmupWeeks: 2,
    };
  }

  if (reputation.warmingAdvantage === 'low') {
    return {
      recommended: false,
      reason: 'Some MX history but insufficient for meaningful warm-up advantage',
      estimatedWarmupWeeks: 4,
    };
  }

  return {
    recommended: false,
    reason: 'No email history -- standard warm-up required',
    estimatedWarmupWeeks: 6,
  };
}

/**
 * Configure a reputation-rich expired domain on Mailcow.
 */
export async function configureReputationDomain(
  domain: string,
  reputation: EmailReputationAssessment,
  mailcowProvider: EmailProvider
): Promise<ReputationTransferResult> {
  const assessment = assessReputationTransfer(reputation);

  if (!assessment.recommended) {
    return {
      domain,
      warmingAdvantage: reputation.warmingAdvantage,
      provisionedOnMailcow: false,
      estimatedWarmupWeeks: assessment.estimatedWarmupWeeks,
      notes: assessment.reason,
    };
  }

  // Provision the domain on Mailcow
  const result = await mailcowProvider.provisionDomain(domain);

  return {
    domain,
    warmingAdvantage: reputation.warmingAdvantage,
    provisionedOnMailcow: result.success,
    estimatedWarmupWeeks: assessment.estimatedWarmupWeeks,
    notes: result.success
      ? `${assessment.reason}. Domain provisioned on Mailcow successfully.`
      : `Provisioning failed: domain not configured on Mailcow.`,
  };
}
