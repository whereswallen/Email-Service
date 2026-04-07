/**
 * Redis pub/sub wrapper for real-time auction events.
 * Uses two ioredis connections: one for subscribe, one for publish.
 */

import IORedis from 'ioredis';
import { getRedis, createSubscriber } from './redis';

export type PubSubHandler = (channel: string, message: string) => void;

let _subscriber: IORedis | null = null;
const handlers = new Map<string, Set<PubSubHandler>>();

function getSubscriber(): IORedis {
  if (!_subscriber) {
    _subscriber = createSubscriber();

    _subscriber.on('message', (channel: string, message: string) => {
      const channelHandlers = handlers.get(channel);
      if (channelHandlers) {
        for (const handler of channelHandlers) {
          try {
            handler(channel, message);
          } catch (err) {
            console.error(`PubSub handler error on ${channel}:`, err);
          }
        }
      }
    });
  }
  return _subscriber;
}

/**
 * Publish an event to a channel.
 */
export async function publish(channel: string, data: Record<string, unknown>): Promise<void> {
  const redis = getRedis();
  await redis.publish(channel, JSON.stringify(data));
}

/**
 * Subscribe to a channel.
 */
export async function subscribe(channel: string, handler: PubSubHandler): Promise<void> {
  const sub = getSubscriber();

  if (!handlers.has(channel)) {
    handlers.set(channel, new Set());
    await sub.subscribe(channel);
  }

  handlers.get(channel)!.add(handler);
}

/**
 * Unsubscribe a handler from a channel.
 */
export async function unsubscribe(channel: string, handler: PubSubHandler): Promise<void> {
  const channelHandlers = handlers.get(channel);
  if (!channelHandlers) return;

  channelHandlers.delete(handler);

  if (channelHandlers.size === 0) {
    handlers.delete(channel);
    const sub = getSubscriber();
    await sub.unsubscribe(channel);
  }
}

export async function closePubSub(): Promise<void> {
  if (_subscriber) {
    await _subscriber.quit();
    _subscriber = null;
  }
  handlers.clear();
}
