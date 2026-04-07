/**
 * Email upsell engine -- present email offers after domain registration or auction win.
 */

import { EmailProviderType } from '../types/index';

export interface EmailUpsellOffer {
  domain: string;
  trigger: 'domain_registration' | 'auction_win' | 'portfolio_add';
  suggestedProvider: EmailProviderType;
  suggestedMailboxes: string[];
  monthlyPrice: number;
  bundleDiscount?: number;
  message: string;
}

export function getEmailUpsellOffer(
  domain: string,
  trigger: EmailUpsellOffer['trigger'],
  hasEmailReputation: boolean = false
): EmailUpsellOffer {
  const provider: EmailProviderType = hasEmailReputation ? 'mailcow' : 'opensrs';
  const name = domain.split('.')[0];

  const suggestedMailboxes = [
    `info@${domain}`,
    `hello@${domain}`,
    `${name}@${domain}`,
  ];

  const basePrice = provider === 'opensrs' ? 3.50 : 2.50;

  return {
    domain,
    trigger,
    suggestedProvider: provider,
    suggestedMailboxes,
    monthlyPrice: basePrice,
    bundleDiscount: trigger === 'domain_registration' ? 0.50 : undefined,
    message: `Add professional email to ${domain}? Starting at $${basePrice}/mailbox/mo.`,
  };
}

export interface ConversionEvent {
  domain: string;
  trigger: EmailUpsellOffer['trigger'];
  converted: boolean;
  provider?: EmailProviderType;
  mailboxCount?: number;
  timestamp: Date;
}

const conversions: ConversionEvent[] = [];

export function trackConversion(event: ConversionEvent): void {
  conversions.push(event);
}

export function getConversionRate(trigger?: EmailUpsellOffer['trigger']): { rate: number; total: number; converted: number } {
  const filtered = trigger ? conversions.filter((c) => c.trigger === trigger) : conversions;
  const converted = filtered.filter((c) => c.converted).length;

  return {
    rate: filtered.length > 0 ? converted / filtered.length : 0,
    total: filtered.length,
    converted,
  };
}
