/**
 * Email-Domain Bridge -- integrates domain registration with email services.
 * This is the platform's key differentiator.
 */

export { autoConfigureEmailDNS } from './dns-auto-config';
export { getEmailUpsellOffer, trackConversion } from './upsell';
export { assessReputationTransfer, configureReputationDomain } from './reputation-transfer';
export { calculateBundlePrice, type BundleOffer } from './bundle-pricing';
