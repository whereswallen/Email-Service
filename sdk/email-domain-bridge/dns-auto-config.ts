/**
 * Auto-configure email DNS records when the platform controls the registrar.
 * No manual DNS wizard needed -- the platform sets MX/SPF/DKIM/DMARC directly.
 */

import { RegistrarProvider } from '../providers/registrar/interface';
import { EmailProvider } from '../providers/email/interface';
import { DNSRecord, EmailProviderType } from '../types/index';

export async function autoConfigureEmailDNS(
  domain: string,
  emailProvider: EmailProvider,
  registrar: RegistrarProvider
): Promise<{ success: boolean; recordsSet: number; records: DNSRecord[] }> {
  const requirements = emailProvider.getDNSRequirements(domain);

  // Get existing DNS records to avoid overwriting unrelated records
  const existing = await registrar.getDNSRecords(domain);

  // Filter out records that would conflict (same type + host)
  const newRecords = requirements.filter((req) => {
    return !existing.some((ex) =>
      ex.type === req.type && ex.host === req.host && ex.value === req.value
    );
  });

  if (newRecords.length > 0) {
    // Merge new records with existing non-conflicting records
    const merged = [
      ...existing.filter((ex) =>
        !newRecords.some((nr) => nr.type === ex.type && nr.host === ex.host)
      ),
      ...newRecords,
    ];

    await registrar.setDNSRecords(domain, merged);
  }

  return {
    success: true,
    recordsSet: newRecords.length,
    records: requirements,
  };
}
