/**
 * Redis connection singleton for job queues and pub/sub.
 */

import IORedis from 'ioredis';
import { getConfig } from './config';

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (!_redis) {
    const config = getConfig();
    _redis = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    _redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }
  return _redis;
}

/**
 * Create a new Redis instance for pub/sub subscriber.
 * (ioredis requires a separate connection for subscriptions)
 */
export function createSubscriber(): IORedis {
  const config = getConfig();
  return new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
