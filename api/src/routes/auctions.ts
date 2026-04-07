/**
 * Auction marketplace routes.
 */

import { FastifyInstance } from 'fastify';
import { AuctionServiceAPI } from '../services/auction-service';
import { getPool } from '../lib/db';
import { publish } from '../lib/pubsub';

export default async function auctionRoutes(app: FastifyInstance) {
  const service = new AuctionServiceAPI(getPool());

  // List active auctions
  app.get('/', async (request) => {
    const { status, page, limit } = request.query as Record<string, string>;
    if (status && status !== 'active') {
      return service.getListingsByStatus(status);
    }
    return service.getActiveListings({
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '50', 10),
    });
  });

  // Get auction details
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return service.getListing(id);
  });

  // Create auction listing
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    body.sellerId = request.user.id;
    body.status = 'active';
    body.bidCount = 0;
    const listing = await service.createListing(body as any);
    reply.status(201);
    return listing;
  });

  // Place bid
  app.post('/:id/bid', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { amount, maxBid } = request.body as { amount: number; maxBid?: number };
    const result = await service.placeBid({
      auctionId: id,
      bidderId: request.user.id,
      amount,
      maxBid,
    });

    // Publish real-time event if bid succeeded
    if (result.success) {
      await publish(`auction:${id}`, {
        type: result.auctionExtended ? 'auction_extended' : 'bid_placed',
        auctionId: id,
        currentPrice: result.currentPrice,
        isHighBidder: result.isHighBidder,
        auctionExtended: result.auctionExtended,
        newEndTime: result.newEndTime,
      });
    }

    return result;
  });

  // Get bid history
  app.get('/:id/bids', async (request) => {
    const { id } = request.params as { id: string };
    return service.getBids(id);
  });

  // Submit offer (make_offer listings)
  app.post('/:id/offer', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amount, message } = request.body as { amount: number; message?: string };
    const offer = await service.submitOffer({
      listingId: id,
      buyerId: request.user.id,
      amount,
      message,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 86400000), // 7 days
    } as any);
    reply.status(201);
    return offer;
  });

  // Get offers for a listing
  app.get('/:id/offers', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return service.getOffers(id);
  });

  // Respond to offer
  app.patch('/:id/offers/:offerId', { preHandler: [app.authenticate] }, async (request) => {
    const { offerId } = request.params as { offerId: string };
    const { status, counterAmount } = request.body as { status: string; counterAmount?: number };
    await service.respondToOffer(offerId, status, counterAmount);
    return { success: true };
  });

  // Cancel listing (no bids only)
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.cancelListing(id, request.user.id);
    reply.status(204);
  });
}
