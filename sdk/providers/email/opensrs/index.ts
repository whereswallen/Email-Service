/**
 * OpenSRS email provider -- implements EmailProvider via OpenSRS hosted email API.
 */

import { EmailProvider } from '../interface';
import {
  OpenSRSConfig,
  ProvisionDomainResult,
  DeleteResult,
  DomainInfo,
  CreateMailboxResult,
  MailboxInfo,
  ResetPasswordResult,
  HealthCheckResult,
  DNSRecord,
} from '../../../types/index';
import { buildXmlRequest } from '../../opensrs/shared/xml-builder';
import { sendRequest, OpenSRSHttpConfig } from '../../opensrs/shared/http';

export class OpenSRSEmailProvider implements EmailProvider {
  readonly type = 'opensrs' as const;
  private config: OpenSRSHttpConfig;

  constructor(config: OpenSRSConfig) {
    if (!config.apiUser || !config.apiKey) {
      throw new Error('OpenSRS email API credentials required (OPENSRS_API_USER, OPENSRS_API_KEY)');
    }
    this.config = {
      apiUser: config.apiUser,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || 'https://admin.hostedemail.com/api',
    };
  }

  async provisionDomain(domain: string): Promise<ProvisionDomainResult> {
    const xml = buildXmlRequest({
      action: 'CREATE_DOMAIN',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);

    return {
      success: response.success,
      domain,
      provider: 'opensrs',
    };
  }

  async deleteDomain(domain: string): Promise<DeleteResult> {
    const xml = buildXmlRequest({
      action: 'DELETE_DOMAIN',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);
    return { success: response.success };
  }

  async getDomainInfo(domain: string): Promise<DomainInfo> {
    const xml = buildXmlRequest({
      action: 'GET_DOMAIN',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);

    return {
      domain,
      status: response.success ? 'active' : 'pending',
      mailboxCount: Number(response.attributes['num_mailboxes'] || 0),
      storagePerMailboxMB: 5120,
      createdAt: String(response.attributes['created_at'] || new Date().toISOString()),
      provider: 'opensrs',
    };
  }

  async createMailbox(domain: string, mailbox: string, password: string): Promise<CreateMailboxResult> {
    const xml = buildXmlRequest({
      action: 'CREATE_MAILBOX',
      object: 'MAILBOX',
      attributes: {
        domain,
        mailbox,
        password,
      },
    });

    const response = await sendRequest(this.config, xml);

    return {
      success: response.success,
      fullAddress: `${mailbox}@${domain}`,
      provider: 'opensrs',
    };
  }

  async deleteMailbox(domain: string, mailbox: string): Promise<DeleteResult> {
    const xml = buildXmlRequest({
      action: 'DELETE_MAILBOX',
      object: 'MAILBOX',
      attributes: { domain, mailbox },
    });

    const response = await sendRequest(this.config, xml);
    return { success: response.success };
  }

  async listMailboxes(domain: string): Promise<MailboxInfo[]> {
    const xml = buildXmlRequest({
      action: 'GET_DOMAIN_MAILBOXES',
      object: 'DOMAIN',
      attributes: { domain },
    });

    const response = await sendRequest(this.config, xml);

    // Parse mailbox list from response attributes
    const mailboxes: MailboxInfo[] = [];
    const list = response.attributes['mailboxes'];

    if (Array.isArray(list)) {
      for (const mb of list) {
        mailboxes.push({
          address: String(mb),
          domain,
          fullAddress: `${mb}@${domain}`,
          storageLimitMB: 5120,
          active: true,
        });
      }
    }

    return mailboxes;
  }

  async resetPassword(domain: string, mailbox: string, newPassword: string): Promise<ResetPasswordResult> {
    const xml = buildXmlRequest({
      action: 'SET_MAILBOX_PASSWORD',
      object: 'MAILBOX',
      attributes: { domain, mailbox, password: newPassword },
    });

    const response = await sendRequest(this.config, xml);
    return { success: response.success };
  }

  getDNSRequirements(domain: string): DNSRecord[] {
    return [
      { type: 'MX', host: domain, value: 'mx.opensrs.net', priority: 10, ttl: 3600 },
      { type: 'TXT', host: domain, value: 'v=spf1 include:_spf.opensrs.net -all', ttl: 3600 },
      { type: 'TXT', host: `default._domainkey.${domain}`, value: '(provided by OpenSRS after domain provisioning)', ttl: 3600 },
      { type: 'TXT', host: `_dmarc.${domain}`, value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`, ttl: 3600 },
    ];
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const xml = buildXmlRequest({
        action: 'GET_DOMAIN',
        object: 'DOMAIN',
        attributes: { domain: 'healthcheck.test' },
      });
      await sendRequest(this.config, xml);
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, details: String(err) };
    }
  }
}
