/**
 * OpenSRS domain registration provider.
 * Uses the OpenSRS Reseller API at rr-n1-tor.opensrs.net:55443.
 */

import { RegistrarProvider } from '../interface';
import {
  RegistrarType,
  DNSRecord,
  HealthCheckResult,
  OpenSRSRegistrarConfig,
} from '../../../types/index';
import {
  AvailabilityResult,
  TLDPricing,
  RegisterDomainRequest,
  DomainRegistration,
  RenewalResult,
  TransferResult,
  TransferStatus,
  WhoisInfo,
  WhoisContact,
  RegisteredDomain,
} from '../../../types/domain-registration';
import { buildXmlRequest } from '../../opensrs/shared/xml-builder';
import { sendRequest, OpenSRSHttpConfig } from '../../opensrs/shared/http';

export class OpenSRSRegistrarProvider implements RegistrarProvider {
  readonly name: RegistrarType = 'opensrs';
  private config: OpenSRSHttpConfig;

  constructor(config: OpenSRSRegistrarConfig) {
    if (!config.apiUser || !config.apiKey) {
      throw new Error('OpenSRS registrar credentials required');
    }
    this.config = {
      apiUser: config.apiUser,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || 'https://rr-n1-tor.opensrs.net:55443',
    };
  }

  async checkAvailability(domain: string): Promise<AvailabilityResult> {
    const xml = buildXmlRequest({
      action: 'LOOKUP',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);
    const status = String(response.attributes['status'] || '');

    return {
      domain,
      available: status === 'available',
      premium: false,
      registrar: 'opensrs',
    };
  }

  async checkBulkAvailability(domains: string[]): Promise<AvailabilityResult[]> {
    return Promise.all(domains.map((d) => this.checkAvailability(d)));
  }

  async getPricing(tld: string): Promise<TLDPricing> {
    const xml = buildXmlRequest({
      action: 'GET_PRICE',
      object: 'DOMAIN',
      attributes: { domain: `example.${tld}`, period: 1 },
    });

    const response = await sendRequest(this.config, xml);

    return {
      tld,
      registration: Number(response.attributes['price'] || 0),
      renewal: Number(response.attributes['renewal_price'] || response.attributes['price'] || 0),
      transfer: Number(response.attributes['transfer_price'] || response.attributes['price'] || 0),
      currency: 'USD',
      registrar: 'opensrs',
    };
  }

  async registerDomain(request: RegisterDomainRequest): Promise<DomainRegistration> {
    const contactBlock = this.buildContactBlock(request.contact);

    const xml = buildXmlRequest({
      action: 'SW_REGISTER',
      object: 'DOMAIN',
      attributes: {
        domain: request.domain,
        period: request.years,
        reg_username: this.config.apiUser,
        reg_password: this.config.apiKey,
        custom_nameservers: request.nameservers ? 1 : 0,
        ...(request.nameservers ? { nameserver_list: request.nameservers } : {}),
        ...(request.whoisPrivacy ? { whois_privacy_state: 'enable' } : {}),
        contact_set: contactBlock,
        auto_renew: request.autoRenew ? 1 : 0,
        handle: 'process',
      },
    });

    const response = await sendRequest(this.config, xml);

    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + request.years);

    return {
      domain: request.domain,
      registrar: 'opensrs',
      registrarDomainId: String(response.attributes['id'] || ''),
      status: response.success ? 'active' : 'pending_registration',
      registeredAt: now,
      expiresAt: expiry,
    };
  }

  async renewDomain(domain: string, years: number = 1): Promise<RenewalResult> {
    // First get current expiry to calculate new expiry
    const info = await this.getDomainInfo(domain);

    const xml = buildXmlRequest({
      action: 'RENEW',
      object: 'DOMAIN',
      attributes: {
        domain,
        period: years,
        currentexpirationyear: info.expiresAt.getFullYear(),
        handle: 'process',
      },
    });

    const response = await sendRequest(this.config, xml);
    const newExpiry = new Date(info.expiresAt);
    newExpiry.setFullYear(newExpiry.getFullYear() + years);

    return {
      domain,
      success: response.success,
      newExpiryDate: newExpiry,
      cost: Number(response.attributes['price'] || 0),
    };
  }

  async initiateTransferIn(domain: string, authCode: string): Promise<TransferResult> {
    const xml = buildXmlRequest({
      action: 'SW_REGISTER',
      object: 'DOMAIN',
      attributes: {
        domain,
        reg_type: 'transfer',
        auth_info: authCode,
        handle: 'process',
      },
    });

    const response = await sendRequest(this.config, xml);

    return {
      domain,
      status: response.success ? 'initiated' : 'failed',
      transferId: String(response.attributes['id'] || ''),
    };
  }

  async getTransferStatus(domain: string): Promise<TransferStatus> {
    const xml = buildXmlRequest({
      action: 'CHECK_TRANSFER',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);
    const status = String(response.attributes['status'] || 'pending');

    return {
      domain,
      status: status as TransferStatus['status'],
      initiatedAt: new Date(String(response.attributes['request_date'] || new Date())),
      updatedAt: new Date(),
    };
  }

  async getAuthCode(domain: string): Promise<string> {
    const xml = buildXmlRequest({
      action: 'GET',
      object: 'DOMAIN',
      attributes: {
        domain,
        type: 'domain_auth_info',
      },
    });

    const response = await sendRequest(this.config, xml);
    return String(response.attributes['domain_auth_info'] || '');
  }

  async getDNSRecords(domain: string): Promise<DNSRecord[]> {
    const xml = buildXmlRequest({
      action: 'GET_DNS_ZONE',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);
    // Parse DNS records from response -- format varies by OpenSRS version
    return [];
  }

  async setDNSRecords(domain: string, records: DNSRecord[]): Promise<void> {
    const xml = buildXmlRequest({
      action: 'SET_DNS_ZONE',
      object: 'DOMAIN',
      attributes: {
        domain,
        records: records.map((r) => ({
          type: r.type,
          subdomain: r.host,
          ip_address: r.value,
          priority: r.priority,
        })),
      },
    });

    await sendRequest(this.config, xml);
  }

  async setNameservers(domain: string, nameservers: string[]): Promise<void> {
    const xml = buildXmlRequest({
      action: 'ADVANCED_UPDATE_NAMESERVERS',
      object: 'DOMAIN',
      attributes: {
        domain,
        op_type: 'assign',
        assign_ns: nameservers,
      },
    });

    await sendRequest(this.config, xml);
  }

  async getWhoisInfo(domain: string): Promise<WhoisInfo> {
    const xml = buildXmlRequest({
      action: 'GET_WHOIS_PRIVACY',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);
    const info = await this.getDomainInfo(domain);

    return {
      domain,
      registrant: {
        firstName: '', lastName: '', email: '', phone: '',
        address1: '', city: '', state: '', postalCode: '', country: '',
      },
      registrar: 'OpenSRS',
      createdDate: info.registeredAt,
      expiresDate: info.expiresAt,
      updatedDate: new Date(),
      nameservers: info.nameservers,
      status: [],
      whoisPrivacy: String(response.attributes['state']) === 'enable',
    };
  }

  async updateWhoisInfo(domain: string, contact: WhoisContact): Promise<void> {
    const contactBlock = this.buildContactBlock(contact);

    const xml = buildXmlRequest({
      action: 'MODIFY',
      object: 'DOMAIN',
      attributes: {
        domain,
        affect_domains: 0,
        data: 'contact_info',
        contact_set: contactBlock,
      },
    });

    await sendRequest(this.config, xml);
  }

  async enableWhoisPrivacy(domain: string): Promise<void> {
    const xml = buildXmlRequest({
      action: 'SET_WHOIS_PRIVACY',
      object: 'DOMAIN',
      attributes: { domain, state: 'enable' },
    });

    await sendRequest(this.config, xml);
  }

  async getDomainInfo(domain: string): Promise<RegisteredDomain> {
    const xml = buildXmlRequest({
      action: 'GET',
      object: 'DOMAIN',
      attributes: { domain, type: 'all_info' },
    });

    const response = await sendRequest(this.config, xml);
    const attrs = response.attributes;

    return {
      domain,
      tld: domain.split('.').slice(1).join('.'),
      registrar: 'opensrs',
      registrarDomainId: String(attrs['id'] || ''),
      status: response.success ? 'active' : 'expired',
      registeredAt: new Date(String(attrs['registry_createdate'] || new Date())),
      expiresAt: new Date(String(attrs['registry_expiredate'] || new Date())),
      autoRenew: String(attrs['auto_renew']) === '1',
      nameservers: [],
      whoisPrivacy: String(attrs['whois_privacy_state']) === 'enable',
    };
  }

  async listDomains(): Promise<RegisteredDomain[]> {
    const xml = buildXmlRequest({
      action: 'GET_DOMAINS_BY_EXPIREDATE',
      object: 'DOMAIN',
      attributes: {
        exp_from: '2020-01-01',
        exp_to: '2030-12-31',
        limit: 1000,
      },
    });

    const response = await sendRequest(this.config, xml);
    // Parse domain list from response
    return [];
  }

  async setAutoRenew(domain: string, enabled: boolean): Promise<void> {
    const xml = buildXmlRequest({
      action: 'MODIFY',
      object: 'DOMAIN',
      attributes: {
        domain,
        data: 'expire_action',
        auto_renew: enabled ? 1 : 0,
        let_expire: enabled ? 0 : 1,
      },
    });

    await sendRequest(this.config, xml);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      await this.checkAvailability('healthcheck-test.com');
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, details: String(err) };
    }
  }

  private buildContactBlock(contact: WhoisContact): Record<string, unknown> {
    const contactData = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      org_name: contact.organization || '',
      email: contact.email,
      phone: contact.phone,
      address1: contact.address1,
      address2: contact.address2 || '',
      city: contact.city,
      state: contact.state,
      postal_code: contact.postalCode,
      country: contact.country,
    };

    return {
      owner: contactData,
      admin: contactData,
      billing: contactData,
      tech: contactData,
    };
  }
}
