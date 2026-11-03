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
      maxRetriesPerRequest: 3,
    });
    redisClient.on('error', (err) => {
      logger.warn({ err: err.message }, '[Redis] Connection warning');
    });
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
