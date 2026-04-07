/**
 * Email reputation checker for expired domains.
 *
 * Checks whether an expired domain has existing email reputation that would
 * benefit Mailcow IP warming. This is the platform's unique competitive advantage.
 */

import * as dns from 'dns/promises';
import { EmailReputationAssessment, WarmingAdvantage } from './types';

const SPAM_BLACKLISTS = [
  'zen.spamhaus.org',
  'b.barracudacentral.org',
  'bl.spamcop.net',
  'dnsbl.sorbs.net',
  'multi.surbl.org',
];

export async function checkEmailReputation(domain: string): Promise<EmailReputationAssessment> {
  const [blacklistResult, mxResult, spfResult, dkimResult] = await Promise.allSettled([
    checkBlacklists(domain),
    checkMXHistory(domain),
    checkSPFHistory(domain),
    checkDKIMHistory(domain),
  ]);

  const blacklists = blacklistResult.status === 'fulfilled' ? blacklistResult.value : [];
  const hadMX = mxResult.status === 'fulfilled' ? mxResult.value : { exists: false, provider: undefined };
  const hadSPF = spfResult.status === 'fulfilled' ? spfResult.value : false;
  const hadDKIM = dkimResult.status === 'fulfilled' ? dkimResult.value : false;

  const blacklisted = blacklists.length > 0;

  // Calculate overall score
  let score = 0;
  if (!blacklisted) score += 30;
  if (hadMX.exists) score += 25;
  if (hadSPF) score += 20;
  if (hadDKIM) score += 25;

  // Determine Mailcow suitability
  const suitableForMailcow = !blacklisted && hadMX.exists;

  let warmingAdvantage: WarmingAdvantage = 'none';
  if (suitableForMailcow) {
    if (hadSPF && hadDKIM && hadMX.exists) warmingAdvantage = 'high';
    else if (hadMX.exists && (hadSPF || hadDKIM)) warmingAdvantage = 'medium';
    else if (hadMX.exists) warmingAdvantage = 'low';
  }

  const notes = buildNotes(blacklisted, hadMX.exists, hadSPF, hadDKIM, warmingAdvantage);

  return {
    domain,
    overallScore: score,
    blacklisted,
    blacklists,
    hadMXRecords: hadMX.exists,
    hadSPFRecord: hadSPF,
    hadDKIMRecord: hadDKIM,
    lastKnownMXProvider: hadMX.provider,
    suitableForMailcow,
    warmingAdvantage,
    notes,
  };
}

async function checkBlacklists(domain: string): Promise<string[]> {
  const listed: string[] = [];

  const checks = SPAM_BLACKLISTS.map(async (bl) => {
    try {
      await dns.resolve4(`${domain}.${bl}`);
      listed.push(bl);
    } catch {
      // NXDOMAIN = not listed (good)
    }
  });

  await Promise.allSettled(checks);
  return listed;
}

async function checkMXHistory(domain: string): Promise<{ exists: boolean; provider?: string }> {
  try {
    const records = await dns.resolveMx(domain);
    if (records.length > 0) {
      const exchange = records[0].exchange.toLowerCase();
      let provider: string | undefined;

      if (exchange.includes('google') || exchange.includes('gmail')) provider = 'google';
      else if (exchange.includes('outlook') || exchange.includes('microsoft')) provider = 'microsoft';
      else if (exchange.includes('opensrs')) provider = 'opensrs';
      else if (exchange.includes('zoho')) provider = 'zoho';
      else if (exchange.includes('proton')) provider = 'protonmail';
      else provider = 'self-hosted';

      return { exists: true, provider };
    }
  } catch {
    // Domain may not have MX records (expired)
  }
  return { exists: false };
}

async function checkSPFHistory(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    return records.some((r) => r.join('').includes('v=spf1'));
  } catch {
    return false;
  }
}

async function checkDKIMHistory(domain: string): Promise<boolean> {
  const selectors = ['default', 'dkim', 'google', 'selector1', 'selector2', 'k1'];

  for (const selector of selectors) {
    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      if (records.some((r) => r.join('').includes('v=DKIM1'))) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function buildNotes(
  blacklisted: boolean,
  hadMX: boolean,
  hadSPF: boolean,
  hadDKIM: boolean,
  advantage: WarmingAdvantage
): string {
  if (blacklisted) return 'Domain is blacklisted -- not suitable for Mailcow';

  const parts: string[] = [];
  if (advantage === 'high') parts.push('Excellent email reputation -- skip most of Mailcow IP warm-up');
  else if (advantage === 'medium') parts.push('Partial email reputation -- reduced warm-up period');
  else if (advantage === 'low') parts.push('Some MX history -- slight warm-up advantage');
  else parts.push('No email history -- standard warm-up required');

  if (hadMX) parts.push('MX records found');
  if (hadSPF) parts.push('SPF configured');
  if (hadDKIM) parts.push('DKIM configured');

  return parts.join('. ');
}
