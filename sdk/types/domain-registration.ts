/**
 * Domain registration types.
 */

import { RegistrarType } from './index';

export type DomainStatus =
  | 'active'
  | 'pending_registration'
  | 'pending_transfer'
  | 'expired'
  | 'redemption'
  | 'deleted';

export interface AvailabilityResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: DomainPricing;
  registrar: RegistrarType;
}

export interface DomainPricing {
  registration: number;
  renewal: number;
  transfer: number;
  currency: string;
}

export interface TLDPricing {
  tld: string;
  registration: number;
  renewal: number;
  transfer: number;
  currency: string;
  registrar: RegistrarType;
}

export interface RegisterDomainRequest {
  domain: string;
  years: number;
  contact: WhoisContact;
  nameservers?: string[];
  whoisPrivacy?: boolean;
  autoRenew?: boolean;
}

export interface DomainRegistration {
  domain: string;
  registrar: RegistrarType;
  registrarDomainId: string;
  status: DomainStatus;
  registeredAt: Date;
  expiresAt: Date;
}

export interface TransferRequest {
  domain: string;
  authCode: string;
  contact?: WhoisContact;
}

export interface TransferResult {
  domain: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed';
  transferId: string;
}

export interface TransferStatus {
  domain: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  initiatedAt: Date;
  updatedAt: Date;
}

export interface WhoisContact {
  firstName: string;
  lastName: string;
  organization?: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface WhoisInfo {
  domain: string;
  registrant: WhoisContact;
  registrar: string;
  createdDate: Date;
  expiresDate: Date;
  updatedDate: Date;
  nameservers: string[];
  status: string[];
  whoisPrivacy: boolean;
}

export interface RegisteredDomain {
  domain: string;
  tld: string;
  registrar: RegistrarType;
  registrarDomainId: string;
  status: DomainStatus;
  registeredAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  nameservers: string[];
  whoisPrivacy: boolean;
}

export interface RenewalResult {
  domain: string;
  success: boolean;
  newExpiryDate: Date;
  cost: number;
}
