/**
 * Domain Registration Service -- orchestrates domain operations across registrar providers.
 */

import { RegistrarProvider } from '../providers/registrar/interface';
import { createRegistrarProvider } from '../providers/registrar/factory';
import {
  AvailabilityResult,
  RegisterDomainRequest,
  DomainRegistration,
  RenewalResult,
  RegisteredDomain,
  TLDPricing,
} from '../types/domain-registration';
import { DNSRecord } from '../types/index';

export class DomainRegistrationService {
  private registrar: RegistrarProvider;

  constructor(registrar?: RegistrarProvider) {
    this.registrar = registrar || createRegistrarProvider();
  }

  async checkAvailability(domain: string): Promise<AvailabilityResult> {
    return this.registrar.checkAvailability(domain);
  }

  async checkBulkAvailability(domains: string[]): Promise<AvailabilityResult[]> {
    return this.registrar.checkBulkAvailability(domains);
  }

  async getPricing(tld: string): Promise<TLDPricing> {
    return this.registrar.getPricing(tld);
  }

  async register(request: RegisterDomainRequest): Promise<DomainRegistration> {
    const availability = await this.registrar.checkAvailability(request.domain);
    if (!availability.available) {
      throw new Error(`Domain ${request.domain} is not available for registration`);
    }

    return this.registrar.registerDomain(request);
  }

  async renew(domain: string, years?: number): Promise<RenewalResult> {
    return this.registrar.renewDomain(domain, years);
  }

  async transfer(domain: string, authCode: string) {
    return this.registrar.initiateTransferIn(domain, authCode);
  }

  async getDomainInfo(domain: string): Promise<RegisteredDomain> {
    return this.registrar.getDomainInfo(domain);
  }

  async listDomains(): Promise<RegisteredDomain[]> {
    return this.registrar.listDomains();
  }

  async getDNSRecords(domain: string): Promise<DNSRecord[]> {
    return this.registrar.getDNSRecords(domain);
  }

  async setDNSRecords(domain: string, records: DNSRecord[]): Promise<void> {
    return this.registrar.setDNSRecords(domain, records);
  }

  async setAutoRenew(domain: string, enabled: boolean): Promise<void> {
    return this.registrar.setAutoRenew(domain, enabled);
  }

  async enableWhoisPrivacy(domain: string): Promise<void> {
    return this.registrar.enableWhoisPrivacy(domain);
  }

  async getAuthCode(domain: string): Promise<string> {
    return this.registrar.getAuthCode(domain);
  }
}
