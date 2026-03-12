/**
 * Shared types for the Email Service SDK.
 */

export interface EmailDomain {
  id: string;
  domain: string;
  status: 'pending_dns' | 'active' | 'suspended';
  dnsVerified: boolean;
  mailboxCount: number;
  createdAt: Date;
}

export interface EmailMailbox {
  id: string;
  domainId: string;
  address: string;        // e.g., "info"
  fullAddress: string;    // e.g., "info@business.com"
  domain: string;         // e.g., "business.com"
  storageUsedMB: number;
  storageLimitMB: number;
  createdAt: Date;
}

export interface ProvisionRequest {
  domain: string;
  mailbox: string;
  password: string;
}

export interface DNSRecord {
  type: 'MX' | 'TXT' | 'CNAME';
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
