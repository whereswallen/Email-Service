/**
 * DNS record verification for customer domains.
 *
 * Checks that MX, SPF, DKIM, and DMARC records are configured correctly
 * before enabling email for a domain.
 */

import { resolve, resolveTxt, resolveMx } from 'dns/promises';

export interface DNSVerificationResult {
  mx: boolean;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  allPassing: boolean;
  details: {
    mx: string;
    spf: string;
    dkim: string;
    dmarc: string;
  };
}

/**
 * Verify that a domain has the correct DNS records for email.
 *
 * @param domain - The domain to verify (e.g., "customerbusiness.com")
 * @param expectedMx - Expected MX hostname (default: OpenSRS MX)
 */
export async function verifyDNS(
  domain: string,
  expectedMx: string = 'mx.opensrs.net'
): Promise<DNSVerificationResult> {
  const result: DNSVerificationResult = {
    mx: false,
    spf: false,
    dkim: false,
    dmarc: false,
    allPassing: false,
    details: { mx: '', spf: '', dkim: '', dmarc: '' },
  };

  // Check MX records
  try {
    const mxRecords = await resolveMx(domain);
    const hasCorrectMx = mxRecords.some(
      (r) => r.exchange.toLowerCase().includes(expectedMx.toLowerCase())
    );
    result.mx = hasCorrectMx;
    result.details.mx = hasCorrectMx
      ? `Found: ${mxRecords.map((r) => r.exchange).join(', ')}`
      : `Expected ${expectedMx}, found: ${mxRecords.map((r) => r.exchange).join(', ') || 'none'}`;
  } catch {
    result.details.mx = 'No MX records found';
  }

  // Check SPF record
  try {
    const txtRecords = await resolveTxt(domain);
    const spfRecord = txtRecords.flat().find((r) => r.startsWith('v=spf1'));
    if (spfRecord) {
      result.spf = spfRecord.includes('opensrs');
      result.details.spf = spfRecord;
    } else {
      result.details.spf = 'No SPF record found';
    }
  } catch {
    result.details.spf = 'DNS lookup failed';
  }

  // Check DKIM record
  try {
    const dkimRecords = await resolveTxt(`default._domainkey.${domain}`);
    const dkimRecord = dkimRecords.flat().find((r) => r.includes('DKIM1'));
    result.dkim = !!dkimRecord;
    result.details.dkim = dkimRecord || 'No DKIM record found at default._domainkey';
  } catch {
    result.details.dkim = 'No DKIM record found';
  }

  // Check DMARC record
  try {
    const dmarcRecords = await resolveTxt(`_dmarc.${domain}`);
    const dmarcRecord = dmarcRecords.flat().find((r) => r.startsWith('v=DMARC1'));
    result.dmarc = !!dmarcRecord;
    result.details.dmarc = dmarcRecord || 'No DMARC record found';
  } catch {
    result.details.dmarc = 'No DMARC record found';
  }

  result.allPassing = result.mx && result.spf && result.dkim && result.dmarc;

  return result;
}
