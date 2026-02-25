/**
 * OpenSRS Email Reseller API Client
 *
 * Wraps the OpenSRS hosted email API for provisioning domains and mailboxes.
 * Used by both the standalone reselling business and the VNDR Hub integration.
 *
 * Docs: https://opensrs.com/resources/documentation/
 */

import { createMailbox, deleteMailbox, listMailboxes, resetPassword } from './mailbox';
import { provisionDomain, deleteDomain, getDomainInfo } from './domain';
import { verifyDNS } from './dns-verify';

export interface OpenSRSConfig {
  apiUser: string;
  apiKey: string;
  apiUrl: string;
}

export class OpenSRSClient {
  private config: OpenSRSConfig;

  constructor(config: OpenSRSConfig) {
    this.config = config;
  }

  // Domain operations
  async provisionDomain(domain: string) {
    return provisionDomain(this.config, domain);
  }

  async deleteDomain(domain: string) {
    return deleteDomain(this.config, domain);
  }

  async getDomainInfo(domain: string) {
    return getDomainInfo(this.config, domain);
  }

  // Mailbox operations
  async createMailbox(domain: string, mailbox: string, password: string) {
    return createMailbox(this.config, domain, mailbox, password);
  }

  async deleteMailbox(domain: string, mailbox: string) {
    return deleteMailbox(this.config, domain, mailbox);
  }

  async listMailboxes(domain: string) {
    return listMailboxes(this.config, domain);
  }

  async resetPassword(domain: string, mailbox: string, newPassword: string) {
    return resetPassword(this.config, domain, mailbox, newPassword);
  }

  // DNS verification
  async verifyDNS(domain: string) {
    return verifyDNS(domain);
  }
}

export function createClient(config?: Partial<OpenSRSConfig>): OpenSRSClient {
  const fullConfig: OpenSRSConfig = {
    apiUser: config?.apiUser || process.env.OPENSRS_API_USER || '',
    apiKey: config?.apiKey || process.env.OPENSRS_API_KEY || '',
    apiUrl: config?.apiUrl || process.env.OPENSRS_API_URL || 'https://admin.hostedemail.com/api',
  };

  if (!fullConfig.apiUser || !fullConfig.apiKey) {
    throw new Error('OpenSRS API credentials required. Set OPENSRS_API_USER and OPENSRS_API_KEY.');
  }

  return new OpenSRSClient(fullConfig);
}
