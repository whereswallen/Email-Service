/**
 * Auction closer -- runs every minute, closes auctions past their end time.
 */

import { Job } from 'bullmq';
import { AuctionServiceAPI } from '../../services/auction-service';
import { getPool } from '../../lib/db';
import { publish } from '../../lib/pubsub';

export async function processAuctionCloser(job: Job): Promise<void> {
  const service = new AuctionServiceAPI(getPool());
  const closed = await service.closeExpiredAuctions();

  for (const auction of closed) {
    // Publish real-time event to WebSocket clients
    await publish(`auction:${auction.id}`, {
      type: 'auction_ended',
      auctionId: auction.id,
      winnerId: auction.winnerId,
      finalPrice: auction.currentBid,
      bidCount: auction.bidCount,
    });

    console.log(`Closed auction ${auction.id}: winner=${auction.winnerId}, price=${auction.currentBid}`);
  }

  if (closed.length > 0) {
    console.log(`Closed ${closed.length} expired auction(s)`);
  }
}
