/**
 * RegistrarProvider interface -- domain registration abstraction.
 * Currently implemented by OpenSRS. Designed for future registrars (Dynadot, NameSilo, GoDaddy).
 */

import { RegistrarType, DNSRecord, HealthCheckResult } from '../../types/index';
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
} from '../../types/domain-registration';

export interface RegistrarProvider {
  readonly name: RegistrarType;

  // Availability & pricing
  checkAvailability(domain: string): Promise<AvailabilityResult>;
  checkBulkAvailability(domains: string[]): Promise<AvailabilityResult[]>;
  getPricing(tld: string): Promise<TLDPricing>;

  // Registration
  registerDomain(request: RegisterDomainRequest): Promise<DomainRegistration>;
  renewDomain(domain: string, years?: number): Promise<RenewalResult>;

  // Transfer
  initiateTransferIn(domain: string, authCode: string): Promise<TransferResult>;
  getTransferStatus(domain: string): Promise<TransferStatus>;
  getAuthCode(domain: string): Promise<string>;

  // DNS management
  getDNSRecords(domain: string): Promise<DNSRecord[]>;
  setDNSRecords(domain: string, records: DNSRecord[]): Promise<void>;
  setNameservers(domain: string, nameservers: string[]): Promise<void>;

  // WHOIS
  getWhoisInfo(domain: string): Promise<WhoisInfo>;
  updateWhoisInfo(domain: string, contact: WhoisContact): Promise<void>;
  enableWhoisPrivacy(domain: string): Promise<void>;

  // Lifecycle
  getDomainInfo(domain: string): Promise<RegisteredDomain>;
  listDomains(): Promise<RegisteredDomain[]>;
  setAutoRenew(domain: string, enabled: boolean): Promise<void>;

  // Health
  healthCheck(): Promise<HealthCheckResult>;
}
