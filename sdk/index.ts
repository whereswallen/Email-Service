/**
 * Domain & Email Platform SDK
 *
 * Unified SDK for domain registration, portfolio management, expired domain
 * acquisition, auction marketplace, and email reselling (OpenSRS + Mailcow).
 */

// Provider factories
export { createEmailProvider } from './providers/email/factory';
export { createRegistrarProvider } from './providers/registrar/factory';

// Provider interfaces
export type { EmailProvider } from './providers/email/interface';
export type { RegistrarProvider } from './providers/registrar/interface';

// Services
export { DomainRegistrationService } from './domain-registration/index';
export { PortfolioService } from './domain-portfolio/index';
export { ExpiredDomainService } from './expired-domains/index';
export { AuctionService } from './auction/index';

// Bridge
export { autoConfigureEmailDNS } from './email-domain-bridge/dns-auto-config';
export { getEmailUpsellOffer } from './email-domain-bridge/upsell';
export { assessReputationTransfer, configureReputationDomain } from './email-domain-bridge/reputation-transfer';
export { calculateBundlePrice } from './email-domain-bridge/bundle-pricing';

// DNS
export { verifyDNS } from './dns/verify';

// Types
export * from './types/index';
export * from './types/domain-registration';
export * from './types/domain-portfolio';
export * from './types/auction';
export * from './types/customer';
export * from './types/billing';
