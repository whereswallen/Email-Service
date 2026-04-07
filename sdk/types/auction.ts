/**
 * Auction marketplace types.
 */

export type ListingType = 'auction' | 'buy_now' | 'make_offer';
export type AuctionStatus = 'scheduled' | 'active' | 'ended' | 'settled' | 'cancelled';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';

export interface AuctionListing {
  id: string;
  domainId: string;
  sellerId: string;
  type: ListingType;
  status: AuctionStatus;

  // Pricing
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  currentBid?: number;
  bidCount: number;
  minimumIncrement: number;

  // Timing
  startsAt: Date;
  endsAt: Date;
  autoExtend: boolean;
  autoExtendMinutes: number;

  // Domain metadata (denormalized for search)
  domain: string;
  tld: string;
  domainAge?: number;
  backlinks?: number;
  domainAuthority?: number;
  hasEmailReputation?: boolean;

  // Settlement
  winnerId?: string;
  platformFeePercent: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  maxBid?: number;
  stripePaymentIntentId?: string;
  isWinning: boolean;
  createdAt: Date;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number;
  status: OfferStatus;
  counterAmount?: number;
  message?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface BidRequest {
  auctionId: string;
  bidderId: string;
  amount: number;
  maxBid?: number;
}

export interface BidResult {
  success: boolean;
  bid?: Bid;
  currentPrice: number;
  isHighBidder: boolean;
  auctionExtended: boolean;
  newEndTime?: Date;
  error?: string;
}

export interface AuctionSettlement {
  auctionId: string;
  winnerId: string;
  sellerId: string;
  finalPrice: number;
  platformFee: number;
  sellerPayout: number;
  stripePaymentId: string;
  stripeTransferId?: string;
  domainTransferred: boolean;
  settledAt?: Date;
}
