/**
 * Mailcow email provider -- implements EmailProvider via Mailcow REST API.
 */

import { EmailProvider } from '../interface';
import {
  MailcowConfig,
  ProvisionDomainResult,
  DeleteResult,
  DomainInfo,
  CreateMailboxResult,
  MailboxInfo,
  ResetPasswordResult,
  HealthCheckResult,
  DNSRecord,
} from '../../../types/index';
import { MailcowApiClient } from './api-client';

export class MailcowEmailProvider implements EmailProvider {
  readonly type = 'mailcow' as const;
  private client: MailcowApiClient;
  private hostname: string;

  constructor(config: MailcowConfig) {
    if (!config.apiUrl || !config.apiKey) {
      throw new Error('Mailcow API credentials required (MAILCOW_API_URL, MAILCOW_API_KEY)');
    }
    this.client = new MailcowApiClient(config.apiUrl, config.apiKey);
    this.hostname = new URL(config.apiUrl).hostname;
  }

  async provisionDomain(domain: string): Promise<ProvisionDomainResult> {
    const result = await this.client.post('/api/v1/add/domain', {
      domain,
      description: domain,
      aliases: 100,
      mailboxes: 1000,
      maxquota: 10240,
      quota: 102400,
      active: 1,
      restart_sogo: 1,
    });

    // Generate DKIM key for the domain
    await this.client.post('/api/v1/add/dkim', {
      domains: domain,
      dkim_selector: 'dkim',
      key_size: 2048,
    }).catch(() => { /* DKIM generation may fail if already exists */ });

    return {
      success: Array.isArray(result) ? result[0]?.type === 'success' : true,
      domain,
      provider: 'mailcow',
    };
  }

  async deleteDomain(domain: string): Promise<DeleteResult> {
    const result = await this.client.post('/api/v1/delete/domain', [domain]);
    return {
      success: Array.isArray(result) ? result[0]?.type === 'success' : true,
    };
  }

  async getDomainInfo(domain: string): Promise<DomainInfo> {
    const result = await this.client.get(`/api/v1/get/domain/${domain}`);

    return {
      domain,
      status: result.active === 1 ? 'active' : 'suspended',
      mailboxCount: Number(result.mboxes_in_domain || 0),
      maxMailboxes: result.mailboxes ? Number(result.mailboxes) : undefined,
      createdAt: String(result.created || new Date().toISOString()),
      provider: 'mailcow',
    };
  }

  async createMailbox(domain: string, mailbox: string, password: string): Promise<CreateMailboxResult> {
    const result = await this.client.post('/api/v1/add/mailbox', {
      local_part: mailbox,
      domain,
      password,
      password2: password,
      quota: 5120, // 5GB default
      active: 1,
      force_pw_update: 0,
      tls_enforce_in: 0,
      tls_enforce_out: 0,
    });

    return {
      success: Array.isArray(result) ? result[0]?.type === 'success' : true,
      fullAddress: `${mailbox}@${domain}`,
      provider: 'mailcow',
    };
  }

  async deleteMailbox(domain: string, mailbox: string): Promise<DeleteResult> {
    const result = await this.client.post('/api/v1/delete/mailbox', [`${mailbox}@${domain}`]);
    return {
      success: Array.isArray(result) ? result[0]?.type === 'success' : true,
    };
  }

  async listMailboxes(domain: string): Promise<MailboxInfo[]> {
    const result = await this.client.get(`/api/v1/get/mailbox/${domain}`);

    if (!Array.isArray(result)) return [];

    return result.map((mb: Record<string, unknown>) => ({
      address: String(mb.local_part || ''),
      domain,
      fullAddress: String(mb.username || ''),
      storageUsedMB: Math.round(Number(mb.quota_used || 0) / 1048576),
      storageLimitMB: Math.round(Number(mb.quota || 0) / 1048576),
      active: mb.active === 1,
    }));
  }

  async resetPassword(domain: string, mailbox: string, newPassword: string): Promise<ResetPasswordResult> {
    const result = await this.client.post('/api/v1/edit/mailbox', {
      items: [`${mailbox}@${domain}`],
      attr: {
        password: newPassword,
        password2: newPassword,
      },
    });

    return {
      success: Array.isArray(result) ? result[0]?.type === 'success' : true,
    };
  }

  getDNSRequirements(domain: string): DNSRecord[] {
    return [
      { type: 'MX', host: domain, value: `${this.hostname}`, priority: 10, ttl: 3600 },
      { type: 'TXT', host: domain, value: `v=spf1 a mx ip4:(server-ip) -all`, ttl: 3600 },
      { type: 'TXT', host: `dkim._domainkey.${domain}`, value: '(retrieve via Mailcow API after domain provisioning)', ttl: 3600 },
      { type: 'TXT', host: `_dmarc.${domain}`, value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`, ttl: 3600 },
      { type: 'A', host: `autodiscover.${domain}`, value: '(server-ip)', ttl: 3600 },
      { type: 'A', host: `autoconfig.${domain}`, value: '(server-ip)', ttl: 3600 },
    ];
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      await this.client.get('/api/v1/get/status/containers');
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, details: String(err) };
    }
  }
}
