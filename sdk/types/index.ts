/**
 * Shared types for the Domain & Email Platform SDK.
 */

// ---------------------------------------------------------------------------
// Provider types
// ---------------------------------------------------------------------------

export type EmailProviderType = 'opensrs' | 'mailcow';
export type RegistrarType = 'opensrs';

export interface OpenSRSConfig {
  apiUser: string;
  apiKey: string;
  apiUrl: string;
}

export interface MailcowConfig {
  apiUrl: string;
  apiKey: string;
}

export interface OpenSRSRegistrarConfig {
  apiUser: string;
  apiKey: string;
  apiUrl: string;
}

export interface EmailProviderConfig {
  type: EmailProviderType;
  opensrs?: OpenSRSConfig;
  mailcow?: MailcowConfig;
}

export interface RegistrarProviderConfig {
  type: RegistrarType;
  opensrs?: OpenSRSRegistrarConfig;
}

// ---------------------------------------------------------------------------
// Email types
// ---------------------------------------------------------------------------

export interface EmailDomain {
  id: string;
  domain: string;
  status: 'pending_dns' | 'active' | 'suspended';
  dnsVerified: boolean;
  mailboxCount: number;
  provider: EmailProviderType;
  createdAt: Date;
}

export interface EmailMailbox {
  id: string;
  domainId: string;
  address: string;
  fullAddress: string;
  domain: string;
  storageUsedMB: number;
  storageLimitMB: number;
  active: boolean;
  createdAt: Date;
}

export interface ProvisionRequest {
  domain: string;
  mailbox: string;
  password: string;
}

// ---------------------------------------------------------------------------
// DNS types
// ---------------------------------------------------------------------------

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
  host: string;
  value: string;
  priority?: number;
  ttl: number;
}

export interface DNSStatus {
  mx: boolean;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  allPassing: boolean;
}

export interface DNSVerifyOptions {
  expectedMx: string;
  spfInclude?: string;
  dkimSelector?: string;
}

// ---------------------------------------------------------------------------
// Provider result types
// ---------------------------------------------------------------------------

export interface ProvisionDomainResult {
  success: boolean;
  domain: string;
  provider: EmailProviderType;
}

export interface DeleteResult {
  success: boolean;
}

export interface DomainInfo {
  domain: string;
  status: 'active' | 'pending' | 'suspended';
  mailboxCount: number;
  maxMailboxes?: number;
  storagePerMailboxMB?: number;
  createdAt: string;
  provider: EmailProviderType;
}

export interface CreateMailboxResult {
  success: boolean;
  fullAddress: string;
  provider: EmailProviderType;
}

export interface MailboxInfo {
  address: string;
  domain: string;
  fullAddress: string;
  storageUsedMB?: number;
  storageLimitMB: number;
  active: boolean;
}

export interface ResetPasswordResult {
  success: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs?: number;
  details?: string;
}
