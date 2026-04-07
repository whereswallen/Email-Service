/**
 * Domain registration service -- wraps SDK registrar operations with DB persistence.
 */

import { Pool } from 'pg';
import { DomainRepository, DomainRow } from '../repositories/domain-repository';
import { PaginationOptions, PaginatedResult } from '../repositories/base-repository';
import { DomainRegistrationService } from '../../../sdk/domain-registration/index';
import { NotFoundError } from '../lib/errors';

export class DomainServiceAPI {
  private repo: DomainRepository;
  private registrationService: DomainRegistrationService;

  constructor(pool: Pool) {
    this.repo = new DomainRepository(pool);
    this.registrationService = new DomainRegistrationService();
  }

  async checkAvailability(domain: string) {
    return this.registrationService.checkAvailability(domain);
  }

  async register(domain: string, years: number, contact: any, customerId: string) {
    // Register via OpenSRS
    const result = await this.registrationService.register({
      domain,
      years,
      contact,
    });

    // Persist to DB
    const tld = domain.split('.').slice(1).join('.');
    const domainRow = await this.repo.create({
      customerId,
      domain,
      tld,
      registrar: 'opensrs',
      registrarDomainId: result.registrarDomainId,
      status: result.status,
      registeredAt: result.registeredAt,
      expiresAt: result.expiresAt,
      autoRenew: true,
      whoisPrivacy: true,
    } as any);

    return domainRow;
  }

  async getDomain(domain: string): Promise<DomainRow> {
    const row = await this.repo.findByDomain(domain);
    if (!row) throw new NotFoundError('Domain', domain);
    return row;
  }

  async getDomainById(id: string): Promise<DomainRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError('Domain', id);
    return row;
  }

  async listDomains(customerId: string, pagination: PaginationOptions): Promise<PaginatedResult<DomainRow>> {
    return this.repo.findByCustomer(customerId, pagination);
  }

  async getExpiring(days: number): Promise<DomainRow[]> {
    return this.repo.findExpiring(days);
  }

  async renew(domain: string) {
    const result = await this.registrationService.renew(domain);

    if (result.success) {
      const row = await this.repo.findByDomain(domain);
      if (row) {
        await this.repo.update(row.id, { expiresAt: result.newExpiryDate } as any);
      }
    }

    return result;
  }

  async transfer(domain: string, authCode: string) {
    return this.registrationService.transfer(domain, authCode);
  }

  async setAutoRenew(domain: string, enabled: boolean) {
    await this.registrationService.setAutoRenew(domain, enabled);
    const row = await this.repo.findByDomain(domain);
    if (row) {
      await this.repo.update(row.id, { autoRenew: enabled } as any);
    }
  }

  async getDNSRecords(domain: string) {
    return this.registrationService.getDNSRecords(domain);
  }

  async setDNSRecords(domain: string, records: any[]) {
    return this.registrationService.setDNSRecords(domain, records);
  }
}
