/**
 * Auction marketplace routes.
 */

import { FastifyInstance } from 'fastify';

export default async function auctionRoutes(app: FastifyInstance) {
  // List active auctions
  app.get('/', async (request) => {
    const { type, sort } = request.query as { type?: string; sort?: string };
    return { listings: [], filter: { type, sort }, placeholder: true };
  });

  // Get auction details
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { id, status: 'active', placeholder: true };
  });

  // Create auction listing
  app.post('/', async (request) => {
    return { success: true, listingId: '', placeholder: true };
  });

  // Place bid
  app.post('/:id/bid', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { amount: number; maxBid?: number };
    return { auctionId: id, success: true, isHighBidder: true, placeholder: true };
  });

  // Get bid history
  app.get('/:id/bids', async (request) => {
    const { id } = request.params as { id: string };
    return { auctionId: id, bids: [], placeholder: true };
  });

  // Submit offer (for make_offer listings)
  app.post('/:id/offer', async (request) => {
    const { id } = request.params as { id: string };
    return { listingId: id, success: true, placeholder: true };
  });

  // Buy now
  app.post('/:id/buy', async (request) => {
    const { id } = request.params as { id: string };
    return { listingId: id, purchased: true, placeholder: true };
  });

  // Cancel listing (only if no bids)
  app.delete('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { id, cancelled: true, placeholder: true };
  });
}
