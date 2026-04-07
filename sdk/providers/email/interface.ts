/**
 * EmailProvider interface -- implemented by OpenSRS and Mailcow providers.
 */

import {
  EmailProviderType,
  ProvisionDomainResult,
  DeleteResult,
  DomainInfo,
  CreateMailboxResult,
  MailboxInfo,
  ResetPasswordResult,
  HealthCheckResult,
  DNSRecord,
} from '../../types/index';

export interface EmailProvider {
  readonly type: EmailProviderType;

  // Domain lifecycle
  provisionDomain(domain: string): Promise<ProvisionDomainResult>;
  deleteDomain(domain: string): Promise<DeleteResult>;
  getDomainInfo(domain: string): Promise<DomainInfo>;

  // Mailbox CRUD
  createMailbox(domain: string, mailbox: string, password: string): Promise<CreateMailboxResult>;
  deleteMailbox(domain: string, mailbox: string): Promise<DeleteResult>;
  listMailboxes(domain: string): Promise<MailboxInfo[]>;
  resetPassword(domain: string, mailbox: string, newPassword: string): Promise<ResetPasswordResult>;

  // DNS requirements for this provider
  getDNSRequirements(domain: string): DNSRecord[];

  // Health
  healthCheck(): Promise<HealthCheckResult>;
}
