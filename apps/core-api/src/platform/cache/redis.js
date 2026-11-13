import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../observability/logger.js';

let redisClient = null;

/**
 * Returns a lazy-initialized Redis client singleton configured with `env.REDIS_URL`.
 * Used by the seat-lease concurrency protocol (`apps/core-api/src/platform/cache/seat-lease.js`).
 *
 * @returns {import('ioredis').Redis}
 */
export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 100, 300);
      },
    });
    redisClient.on('error', (err) => {
      logger.debug({ err: err.message }, '[Redis] Connection warning');
    });
    if (env.NODE_ENV !== 'test') {
      void redisClient.connect().catch(() => {});
    }
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    try {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        await redisClient.quit();
      } else {
        redisClient.disconnect();
      }
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
  }
}
