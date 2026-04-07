/**
 * Auction service -- wraps SDK bidding logic with transactional DB persistence.
 */

import { Pool } from 'pg';
import { AuctionRepository, AuctionRow } from '../repositories/auction-repository';
import { BidRepository, BidRow } from '../repositories/bid-repository';
import { OfferRepository, OfferRow } from '../repositories/offer-repository';
import { PaginationOptions, PaginatedResult } from '../repositories/base-repository';
import { withTransaction } from '../lib/db';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';

export interface PlaceBidRequest {
  auctionId: string;
  bidderId: string;
  amount: number;
  maxBid?: number;
}

export interface BidResult {
  success: boolean;
  bid?: BidRow;
  currentPrice: number;
  isHighBidder: boolean;
  auctionExtended: boolean;
  newEndTime?: Date;
  error?: string;
}

export class AuctionServiceAPI {
  private auctionRepo: AuctionRepository;
  private bidRepo: BidRepository;
  private offerRepo: OfferRepository;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.auctionRepo = new AuctionRepository(pool);
    this.bidRepo = new BidRepository(pool);
    this.offerRepo = new OfferRepository(pool);
  }

  async createListing(data: Partial<AuctionRow>): Promise<AuctionRow> {
    return this.auctionRepo.create(data);
  }

  async getListing(id: string): Promise<AuctionRow> {
    const listing = await this.auctionRepo.findById(id);
    if (!listing) throw new NotFoundError('Auction listing', id);
    return listing;
  }

  async getActiveListings(pagination: PaginationOptions): Promise<PaginatedResult<AuctionRow>> {
    return this.auctionRepo.findActive(pagination);
  }

  async getListingsByStatus(status: string): Promise<AuctionRow[]> {
    return this.auctionRepo.findByStatus(status);
  }

  async getBids(auctionId: string): Promise<BidRow[]> {
    return this.bidRepo.findByAuction(auctionId);
  }

  /**
   * Place a bid with proxy bidding + anti-sniping, wrapped in a DB transaction.
   */
  async placeBid(request: PlaceBidRequest): Promise<BidResult> {
    return withTransaction(async (client) => {
      // Lock the auction row
      const auction = await this.auctionRepo.findByIdForUpdate(client, request.auctionId);
      if (!auction) return { success: false, currentPrice: 0, isHighBidder: false, auctionExtended: false, error: 'Auction not found' };
      if (auction.status !== 'active') return { success: false, currentPrice: auction.currentBid || 0, isHighBidder: false, auctionExtended: false, error: 'Auction is not active' };
      if (auction.sellerId === request.bidderId) return { success: false, currentPrice: auction.currentBid || 0, isHighBidder: false, auctionExtended: false, error: 'Cannot bid on own listing' };

      const currentBid = auction.currentBid || auction.startingPrice || 0;
      const minimumBid = currentBid + auction.minimumIncrement;

      if (request.amount < minimumBid) {
        return { success: false, currentPrice: currentBid, isHighBidder: false, auctionExtended: false, error: `Minimum bid is $${minimumBid.toFixed(2)}` };
      }

      // Find current winning bid for proxy logic
      const previousWinning = await this.bidRepo.findWinning(request.auctionId);

      // Clear previous winning
      await this.bidRepo.clearWinning(client, request.auctionId);

      // Proxy bidding: if previous bidder has a higher max, they keep winning
      if (previousWinning?.maxBid && previousWinning.maxBid >= request.amount && previousWinning.bidderId !== request.bidderId) {
        const newPrice = Math.min(request.amount + auction.minimumIncrement, previousWinning.maxBid);

        // Re-mark previous bid as winning
        await this.bidRepo.markWinning(client, previousWinning.id);

        // Insert new bid (loses)
        const newBid = await this.bidRepo.createWithClient(client, {
          auctionId: request.auctionId,
          bidderId: request.bidderId,
          amount: request.amount,
          maxBid: request.maxBid,
          isWinning: false,
        });

        await this.auctionRepo.updateBid(client, request.auctionId, newPrice, auction.bidCount + 1);

        return { success: true, bid: newBid, currentPrice: newPrice, isHighBidder: false, auctionExtended: false };
      }

      // New bidder wins
      let effectivePrice = request.amount;
      if (previousWinning?.maxBid) {
        effectivePrice = Math.min(
          previousWinning.maxBid + auction.minimumIncrement,
          request.maxBid || request.amount
        );
      }

      const bid = await this.bidRepo.createWithClient(client, {
        auctionId: request.auctionId,
        bidderId: request.bidderId,
        amount: effectivePrice,
        maxBid: request.maxBid,
        isWinning: true,
      });

      // Anti-sniping
      let auctionExtended = false;
      let newEndTime: Date | undefined;
      if (auction.autoExtend && auction.endsAt) {
        const timeRemaining = auction.endsAt.getTime() - Date.now();
        const threshold = auction.autoExtendMinutes * 60 * 1000;
        if (timeRemaining <= threshold) {
          newEndTime = new Date(auction.endsAt.getTime() + threshold);
          auctionExtended = true;
        }
      }

      await this.auctionRepo.updateBid(client, request.auctionId, effectivePrice, auction.bidCount + 1, newEndTime);

      return { success: true, bid, currentPrice: effectivePrice, isHighBidder: true, auctionExtended, newEndTime };
    });
  }

  /**
   * Close an auction and determine the winner.
   */
  async closeAuction(auctionId: string): Promise<AuctionRow> {
    const auction = await this.auctionRepo.findById(auctionId);
    if (!auction) throw new NotFoundError('Auction', auctionId);
    if (auction.status !== 'active') throw new ConflictError('Auction is not active');

    const winningBid = await this.bidRepo.findWinning(auctionId);

    const updates: Partial<AuctionRow> = { status: 'ended' } as any;
    if (winningBid && (!auction.reservePrice || winningBid.amount >= auction.reservePrice)) {
      (updates as any).winnerId = winningBid.bidderId;
    }

    const updated = await this.auctionRepo.update(auctionId, updates);
    return updated!;
  }

  /**
   * Close all auctions past their end time.
   */
  async closeExpiredAuctions(): Promise<AuctionRow[]> {
    const expired = await this.auctionRepo.findExpiredActive();
    const closed: AuctionRow[] = [];
    for (const auction of expired) {
      const result = await this.closeAuction(auction.id);
      closed.push(result);
    }
    return closed;
  }

  async submitOffer(data: Partial<OfferRow>): Promise<OfferRow> {
    return this.offerRepo.create(data);
  }

  async getOffers(listingId: string): Promise<OfferRow[]> {
    return this.offerRepo.findByListing(listingId);
  }

  async respondToOffer(offerId: string, status: string, counterAmount?: number): Promise<void> {
    await this.offerRepo.updateStatus(offerId, status, counterAmount);
  }

  async cancelListing(auctionId: string, sellerId: string): Promise<void> {
    const auction = await this.auctionRepo.findById(auctionId);
    if (!auction) throw new NotFoundError('Auction', auctionId);
    if (auction.sellerId !== sellerId) throw new ValidationError('Not the seller');
    if (auction.bidCount > 0) throw new ConflictError('Cannot cancel auction with bids');

    await this.auctionRepo.update(auctionId, { status: 'cancelled' } as any);
  }
}
