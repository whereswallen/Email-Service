/**
 * Auction Service -- manages domain listings, bidding, and settlement.
 */

import {
  AuctionListing,
  Bid,
  Offer,
  BidRequest,
  BidResult,
  AuctionSettlement,
  AuctionStatus,
} from '../types/auction';

export class AuctionService {
  private listings: Map<string, AuctionListing> = new Map();
  private bids: Map<string, Bid[]> = new Map();
  private offers: Map<string, Offer[]> = new Map();

  createListing(listing: AuctionListing): AuctionListing {
    this.listings.set(listing.id, listing);
    this.bids.set(listing.id, []);
    return listing;
  }

  getListing(id: string): AuctionListing | undefined {
    return this.listings.get(id);
  }

  getActiveListings(): AuctionListing[] {
    return Array.from(this.listings.values())
      .filter((l) => l.status === 'active');
  }

  getListingsByStatus(status: AuctionStatus): AuctionListing[] {
    return Array.from(this.listings.values())
      .filter((l) => l.status === status);
  }

  /**
   * Place a bid with proxy bidding support and anti-sniping.
   */
  placeBid(request: BidRequest): BidResult {
    const listing = this.listings.get(request.auctionId);
    if (!listing) return { success: false, currentPrice: 0, isHighBidder: false, auctionExtended: false, error: 'Auction not found' };
    if (listing.status !== 'active') return { success: false, currentPrice: listing.currentBid || 0, isHighBidder: false, auctionExtended: false, error: 'Auction is not active' };
    if (listing.sellerId === request.bidderId) return { success: false, currentPrice: listing.currentBid || 0, isHighBidder: false, auctionExtended: false, error: 'Cannot bid on own listing' };

    const currentBid = listing.currentBid || listing.startingPrice;
    const minimumBid = currentBid + listing.minimumIncrement;

    if (request.amount < minimumBid) {
      return {
        success: false,
        currentPrice: currentBid,
        isHighBidder: false,
        auctionExtended: false,
        error: `Minimum bid is $${minimumBid.toFixed(2)}`,
      };
    }

    // Process proxy bidding
    const existingBids = this.bids.get(request.auctionId) || [];
    const previousHighBid = existingBids.find((b) => b.isWinning);

    // Mark previous winning bid as not winning
    if (previousHighBid) {
      previousHighBid.isWinning = false;
    }

    // Determine effective price (proxy bidding)
    let effectivePrice = request.amount;
    if (previousHighBid?.maxBid && previousHighBid.maxBid >= request.amount) {
      // Previous bidder's proxy outbids -- new bid loses
      const newPrice = Math.min(request.amount + listing.minimumIncrement, previousHighBid.maxBid);
      previousHighBid.isWinning = true;
      listing.currentBid = newPrice;
      listing.bidCount++;

      const newBid: Bid = {
        id: `bid_${Date.now()}`,
        auctionId: request.auctionId,
        bidderId: request.bidderId,
        amount: request.amount,
        maxBid: request.maxBid,
        isWinning: false,
        createdAt: new Date(),
      };
      existingBids.push(newBid);

      return {
        success: true,
        bid: newBid,
        currentPrice: newPrice,
        isHighBidder: false,
        auctionExtended: false,
      };
    }

    // New bidder wins
    if (previousHighBid?.maxBid) {
      effectivePrice = Math.min(
        previousHighBid.maxBid + listing.minimumIncrement,
        request.maxBid || request.amount
      );
    }

    const bid: Bid = {
      id: `bid_${Date.now()}`,
      auctionId: request.auctionId,
      bidderId: request.bidderId,
      amount: effectivePrice,
      maxBid: request.maxBid,
      isWinning: true,
      createdAt: new Date(),
    };

    existingBids.push(bid);
    listing.currentBid = effectivePrice;
    listing.bidCount++;

    // Anti-sniping: extend auction if bid in last N minutes
    let auctionExtended = false;
    let newEndTime: Date | undefined;

    if (listing.autoExtend) {
      const timeRemaining = listing.endsAt.getTime() - Date.now();
      const extendThreshold = listing.autoExtendMinutes * 60 * 1000;

      if (timeRemaining <= extendThreshold) {
        newEndTime = new Date(listing.endsAt.getTime() + extendThreshold);
        listing.endsAt = newEndTime;
        auctionExtended = true;
      }
    }

    listing.updatedAt = new Date();

    return {
      success: true,
      bid,
      currentPrice: effectivePrice,
      isHighBidder: true,
      auctionExtended,
      newEndTime,
    };
  }

  getBids(auctionId: string): Bid[] {
    return this.bids.get(auctionId) || [];
  }

  getWinningBid(auctionId: string): Bid | undefined {
    const bids = this.bids.get(auctionId) || [];
    return bids.find((b) => b.isWinning);
  }

  /**
   * End an auction and determine the winner.
   */
  closeAuction(auctionId: string): AuctionListing | undefined {
    const listing = this.listings.get(auctionId);
    if (!listing || listing.status !== 'active') return undefined;

    const winningBid = this.getWinningBid(auctionId);

    if (winningBid && (!listing.reservePrice || winningBid.amount >= listing.reservePrice)) {
      listing.status = 'ended';
      listing.winnerId = winningBid.bidderId;
    } else {
      listing.status = 'ended';
      // Reserve not met or no bids -- no winner
    }

    listing.updatedAt = new Date();
    return listing;
  }

  /**
   * Check and close all auctions that have passed their end time.
   */
  closeExpiredAuctions(): AuctionListing[] {
    const now = new Date();
    const closed: AuctionListing[] = [];

    for (const listing of this.listings.values()) {
      if (listing.status === 'active' && listing.endsAt <= now) {
        const result = this.closeAuction(listing.id);
        if (result) closed.push(result);
      }
    }

    return closed;
  }

  submitOffer(offer: Offer): void {
    const existing = this.offers.get(offer.listingId) || [];
    existing.push(offer);
    this.offers.set(offer.listingId, existing);
  }

  getOffers(listingId: string): Offer[] {
    return this.offers.get(listingId) || [];
  }

  cancelListing(auctionId: string): boolean {
    const listing = this.listings.get(auctionId);
    if (!listing || listing.bidCount > 0) return false;

    listing.status = 'cancelled';
    listing.updatedAt = new Date();
    return true;
  }
}
