/**
 * Generalized DNS verification -- supports both OpenSRS and Mailcow expected values.
 * Moved and generalized from opensrs-client/dns-verify.ts.
 */

import * as dns from 'dns/promises';
import { DNSVerifyOptions, DNSStatus } from '../types/index';

const DEFAULT_OPTIONS: Record<string, DNSVerifyOptions> = {
  opensrs: {
    expectedMx: 'mx.opensrs.net',
    spfInclude: '_spf.opensrs.net',
    dkimSelector: 'default',
  },
  mailcow: {
    expectedMx: '', // Set per-instance
    dkimSelector: 'dkim',
  },
};

export interface DNSVerificationResult extends DNSStatus {
  details: {
    mx: string;
    spf: string;
    dkim: string;
    dmarc: string;
  };
}

export async function verifyDNS(
  domain: string,
  options?: DNSVerifyOptions
): Promise<DNSVerificationResult> {
  const opts = options || DEFAULT_OPTIONS.opensrs;

  const [mxResult, spfResult, dkimResult, dmarcResult] = await Promise.allSettled([
    checkMX(domain, opts.expectedMx),
    checkSPF(domain, opts.spfInclude),
    checkDKIM(domain, opts.dkimSelector || 'default'),
    checkDMARC(domain),
  ]);

  const mx = mxResult.status === 'fulfilled' ? mxResult.value : { pass: false, detail: 'Check failed' };
  const spf = spfResult.status === 'fulfilled' ? spfResult.value : { pass: false, detail: 'Check failed' };
  const dkim = dkimResult.status === 'fulfilled' ? dkimResult.value : { pass: false, detail: 'Check failed' };
  const dmarc = dmarcResult.status === 'fulfilled' ? dmarcResult.value : { pass: false, detail: 'Check failed' };

  return {
    mx: mx.pass,
    spf: spf.pass,
    dkim: dkim.pass,
    dmarc: dmarc.pass,
    allPassing: mx.pass && spf.pass && dkim.pass && dmarc.pass,
    details: {
      mx: mx.detail,
      spf: spf.detail,
      dkim: dkim.detail,
      dmarc: dmarc.detail,
    },
  };
}

async function checkMX(domain: string, expectedMx: string): Promise<{ pass: boolean; detail: string }> {
  try {
    const records = await dns.resolveMx(domain);
    if (records.length === 0) return { pass: false, detail: 'No MX records found' };

    const found = records.some((r) =>
      r.exchange.toLowerCase().includes(expectedMx.toLowerCase())
    );

    const detail = records.map((r) => `${r.priority} ${r.exchange}`).join(', ');
    return { pass: found, detail: found ? `OK: ${detail}` : `Expected ${expectedMx}, found: ${detail}` };
  } catch {
    return { pass: false, detail: 'DNS lookup failed' };
  }
}

async function checkSPF(domain: string, expectedInclude?: string): Promise<{ pass: boolean; detail: string }> {
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecords = records.filter((r) => r.join('').startsWith('v=spf1'));

    if (spfRecords.length === 0) return { pass: false, detail: 'No SPF record found' };

    const spf = spfRecords[0].join('');

    if (expectedInclude) {
      const pass = spf.includes(expectedInclude);
      return { pass, detail: pass ? `OK: ${spf}` : `Missing include:${expectedInclude} in: ${spf}` };
    }

    return { pass: true, detail: `OK: ${spf}` };
  } catch {
    return { pass: false, detail: 'DNS lookup failed' };
  }
}

async function checkDKIM(domain: string, selector: string): Promise<{ pass: boolean; detail: string }> {
  try {
    const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
    const dkimRecords = records.filter((r) => r.join('').includes('v=DKIM1'));

    if (dkimRecords.length === 0) return { pass: false, detail: `No DKIM record at ${selector}._domainkey.${domain}` };

    return { pass: true, detail: `OK: DKIM found at ${selector}._domainkey.${domain}` };
  } catch {
    return { pass: false, detail: `No DKIM record at ${selector}._domainkey.${domain}` };
  }
}

async function checkDMARC(domain: string): Promise<{ pass: boolean; detail: string }> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const dmarcRecords = records.filter((r) => r.join('').startsWith('v=DMARC1'));

    if (dmarcRecords.length === 0) return { pass: false, detail: 'No DMARC record found' };

    return { pass: true, detail: `OK: ${dmarcRecords[0].join('')}` };
  } catch {
    return { pass: false, detail: 'No DMARC record found' };
  }
}
