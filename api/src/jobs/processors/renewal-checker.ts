/**
 * Renewal checker -- daily check for domains expiring soon, generates alerts.
 */

import { Job } from 'bullmq';
import { DomainServiceAPI } from '../../services/domain-service';
import { getPool } from '../../lib/db';

export async function processRenewalChecker(job: Job): Promise<void> {
  const service = new DomainServiceAPI(getPool());

  const windows = [7, 30, 90];
  const alerts: { domain: string; daysUntilExpiry: number; severity: string }[] = [];

  for (const days of windows) {
    const expiring = await service.getExpiring(days);

    for (const domain of expiring) {
      const daysLeft = domain.expiresAt
        ? Math.ceil((domain.expiresAt.getTime() - Date.now()) / 86400000)
        : 0;

      const severity = daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'warning' : 'info';

      // Only add if not already in alerts at a more urgent level
      if (!alerts.some((a) => a.domain === domain.domain)) {
        alerts.push({
          domain: domain.domain,
          daysUntilExpiry: daysLeft,
          severity,
        });
      }
    }
  }

  if (alerts.length > 0) {
    const critical = alerts.filter((a) => a.severity === 'critical').length;
    const warning = alerts.filter((a) => a.severity === 'warning').length;
    console.log(`Renewal check: ${critical} critical, ${warning} warning, ${alerts.length} total alerts`);
    // TODO: Store alerts in DB or send notifications
  } else {
    console.log('Renewal check: no expiring domains found');
  }
}
