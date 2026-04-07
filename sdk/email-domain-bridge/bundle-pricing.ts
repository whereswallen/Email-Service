/**
 * Domain + email bundle pricing.
 */

import { EmailProviderType } from '../types/index';

export interface BundleOffer {
  domain: string;
  tld: string;
  domainRegistrationCost: number;
  emailProvider: EmailProviderType;
  mailboxCount: number;
  emailMonthlyPerMailbox: number;
  bundleDiscountPercent: number;
  effectiveMonthlyTotal: number;
  firstYearTotal: number;
}

const BASE_EMAIL_PRICES: Record<EmailProviderType, number> = {
  opensrs: 3.50,
  mailcow: 2.50,
};

export function calculateBundlePrice(
  domain: string,
  domainCost: number,
  mailboxCount: number,
  provider: EmailProviderType = 'opensrs',
  bundleDiscountPercent: number = 15
): BundleOffer {
  const tld = domain.split('.').slice(1).join('.');
  const baseEmailPrice = BASE_EMAIL_PRICES[provider];
  const discountedEmailPrice = baseEmailPrice * (1 - bundleDiscountPercent / 100);

  const monthlyEmailTotal = discountedEmailPrice * mailboxCount;
  const firstYearTotal = domainCost + (monthlyEmailTotal * 12);

  return {
    domain,
    tld,
    domainRegistrationCost: domainCost,
    emailProvider: provider,
    mailboxCount,
    emailMonthlyPerMailbox: discountedEmailPrice,
    bundleDiscountPercent,
    effectiveMonthlyTotal: monthlyEmailTotal,
    firstYearTotal,
  };
}
