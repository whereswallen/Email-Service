/**
 * Portfolio alerts -- expiry warnings, valuation changes, blacklist status.
 */

import { PortfolioDomain } from '../types/domain-portfolio';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface PortfolioAlert {
  type: 'expiry' | 'blacklist' | 'valuation_drop' | 'valuation_increase';
  severity: AlertSeverity;
  domain: string;
  message: string;
  actionRequired: boolean;
  createdAt: Date;
}

export function checkExpiryAlerts(domains: PortfolioDomain[]): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];
  const now = new Date();

  for (const d of domains) {
    const daysUntilExpiry = Math.ceil((d.expiryDate.getTime() - now.getTime()) / 86400000);

    if (daysUntilExpiry <= 7) {
      alerts.push({
        type: 'expiry',
        severity: 'critical',
        domain: d.domain,
        message: `${d.domain} expires in ${daysUntilExpiry} day(s)${d.autoRenew ? ' (auto-renew enabled)' : ' -- RENEW NOW'}`,
        actionRequired: !d.autoRenew,
        createdAt: now,
      });
    } else if (daysUntilExpiry <= 30) {
      alerts.push({
        type: 'expiry',
        severity: 'warning',
        domain: d.domain,
        message: `${d.domain} expires in ${daysUntilExpiry} days`,
        actionRequired: !d.autoRenew,
        createdAt: now,
      });
    } else if (daysUntilExpiry <= 90) {
      alerts.push({
        type: 'expiry',
        severity: 'info',
        domain: d.domain,
        message: `${d.domain} expires in ${daysUntilExpiry} days`,
        actionRequired: false,
        createdAt: now,
      });
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function checkBlacklistAlerts(domains: PortfolioDomain[]): PortfolioAlert[] {
  return domains
    .filter((d) => d.spamBlacklisted)
    .map((d) => ({
      type: 'blacklist' as const,
      severity: 'critical' as const,
      domain: d.domain,
      message: `${d.domain} is on a spam blacklist -- email reputation compromised`,
      actionRequired: true,
      createdAt: new Date(),
    }));
}
