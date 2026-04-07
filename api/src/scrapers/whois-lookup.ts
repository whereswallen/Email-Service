/**
 * WHOIS/RDAP lookup for domain research.
 * Uses RDAP (Registration Data Access Protocol) which is the modern replacement for WHOIS.
 */

import * as https from 'https';

export interface WhoisResult {
  domain: string;
  available: boolean;
  registrar?: string;
  createdDate?: string;
  expiresDate?: string;
  updatedDate?: string;
  nameservers: string[];
  status: string[];
  dnssec?: boolean;
}

/**
 * Look up domain info via RDAP (IANA bootstrap).
 */
export async function lookupDomain(domain: string): Promise<WhoisResult> {
  const tld = domain.split('.').pop() || '';
  const rdapUrl = await getRdapServer(tld);

  if (!rdapUrl) {
    return {
      domain,
      available: false,
      nameservers: [],
      status: ['RDAP server not found for TLD'],
    };
  }

  try {
    const data = await fetchJson(`${rdapUrl}domain/${domain}`);

    const nameservers = (data.nameservers || [])
      .map((ns: any) => ns.ldhName || '')
      .filter(Boolean);

    const status = data.status || [];
    const events = data.events || [];

    const createdEvent = events.find((e: any) => e.eventAction === 'registration');
    const expiresEvent = events.find((e: any) => e.eventAction === 'expiration');
    const updatedEvent = events.find((e: any) => e.eventAction === 'last changed');

    // Find registrar from entities
    const registrarEntity = (data.entities || []).find((e: any) =>
      (e.roles || []).includes('registrar')
    );
    const registrar = registrarEntity?.vcardArray?.[1]?.find(
      (v: any) => v[0] === 'fn'
    )?.[3] || registrarEntity?.publicIds?.[0]?.identifier;

    return {
      domain,
      available: false,
      registrar: registrar || undefined,
      createdDate: createdEvent?.eventDate,
      expiresDate: expiresEvent?.eventDate,
      updatedDate: updatedEvent?.eventDate,
      nameservers,
      status,
      dnssec: data.secureDNS?.delegationSigned || false,
    };
  } catch (err: any) {
    if (err.statusCode === 404) {
      return { domain, available: true, nameservers: [], status: ['available'] };
    }
    throw err;
  }
}

// RDAP bootstrap cache
let rdapBootstrap: Record<string, string> | null = null;

async function getRdapServer(tld: string): Promise<string | null> {
  if (!rdapBootstrap) {
    try {
      const data = await fetchJson('https://data.iana.org/rdap/dns.json');
      rdapBootstrap = {};
      for (const service of data.services || []) {
        const tlds = service[0] as string[];
        const urls = service[1] as string[];
        if (urls.length > 0) {
          for (const t of tlds) {
            rdapBootstrap[t] = urls[0];
          }
        }
      }
    } catch {
      rdapBootstrap = {};
    }
  }

  return rdapBootstrap[tld] || null;
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Accept': 'application/rdap+json, application/json' },
    }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        const err: any = new Error(`HTTP ${res.statusCode}`);
        err.statusCode = res.statusCode;
        reject(err);
        return;
      }
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON from RDAP')); }
      });
    }).on('error', reject);
  });
}
