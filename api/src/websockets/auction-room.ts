/**
 * WebSocket auction room -- real-time bid updates via @fastify/websocket.
 *
 * Clients connect to /ws/auctions/:id and receive events:
 * - bid_placed: { auctionId, currentPrice, bidCount, bidderId }
 * - auction_extended: { auctionId, newEndTime }
 * - auction_ended: { auctionId, winnerId, finalPrice }
 * - outbid: { auctionId, newPrice } (sent to previous high bidder)
 */

import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { subscribe, unsubscribe, PubSubHandler } from '../lib/pubsub';

interface AuctionClient {
  socket: WebSocket;
  auctionId: string;
  userId?: string;
}

const rooms = new Map<string, Set<AuctionClient>>();

export default async function auctionWebSocket(app: FastifyInstance) {
  app.register(import('@fastify/websocket'));

  app.register(async function (fastify) {
    fastify.get('/ws/auctions/:id', { websocket: true }, (socket, request) => {
      const { id: auctionId } = request.params as { id: string };

      const client: AuctionClient = {
        socket,
        auctionId,
        userId: undefined,
      };

      // Add client to room
      if (!rooms.has(auctionId)) {
        rooms.set(auctionId, new Set());
        subscribeToAuction(auctionId);
      }
      rooms.get(auctionId)!.add(client);

      // Handle incoming messages (auth, ping)
      socket.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'auth' && msg.userId) {
            client.userId = msg.userId;
          }

          if (msg.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // Ignore malformed messages
        }
      });

      // Clean up on disconnect
      socket.on('close', () => {
        const room = rooms.get(auctionId);
        if (room) {
          room.delete(client);
          if (room.size === 0) {
            rooms.delete(auctionId);
            unsubscribeFromAuction(auctionId);
          }
        }
      });

      // Send initial connection confirmation
      socket.send(JSON.stringify({
        type: 'connected',
        auctionId,
        clientsInRoom: rooms.get(auctionId)?.size || 1,
      }));
    });
  });
}

/**
 * Subscribe to Redis channel for an auction and fan out to WebSocket clients.
 */
function subscribeToAuction(auctionId: string) {
  const channel = `auction:${auctionId}`;

  const handler: PubSubHandler = (_ch, message) => {
    const room = rooms.get(auctionId);
    if (!room) return;

    const event = JSON.parse(message);

    for (const client of room) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  };

  // Store handler reference for unsubscribe
  auctionHandlers.set(auctionId, handler);
  subscribe(channel, handler);
}

function unsubscribeFromAuction(auctionId: string) {
  const channel = `auction:${auctionId}`;
  const handler = auctionHandlers.get(auctionId);
  if (handler) {
    unsubscribe(channel, handler);
    auctionHandlers.delete(auctionId);
  }
}

const auctionHandlers = new Map<string, PubSubHandler>();

/**
 * Broadcast an event to an auction room (called from auction service after bid).
 */
export function broadcastToAuction(auctionId: string, event: Record<string, unknown>): void {
  const room = rooms.get(auctionId);
  if (!room) return;

  const message = JSON.stringify(event);
  for (const client of room) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(message);
    }
  }
}

export function getRoomSize(auctionId: string): number {
  return rooms.get(auctionId)?.size || 0;
}
