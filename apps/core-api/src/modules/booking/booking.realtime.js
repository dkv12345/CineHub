import { getRedisClient } from '../../platform/cache/redis.js';
import { logger } from '../../platform/observability/logger.js';

/**
 * Map of showtimeKey -> Set<{ res, userId }>
 */
const sseRooms = new Map();

export function buildShowtimeChannel(showtimeId) {
  return `ch:showtime:${showtimeId}`;
}

export function subscribeSseClient(keys, client) {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  for (const key of uniqueKeys) {
    if (!sseRooms.has(key)) {
      sseRooms.set(key, new Set());
    }
    sseRooms.get(key).add(client);
  }

  return () => {
    for (const key of uniqueKeys) {
      const room = sseRooms.get(key);
      if (room) {
        room.delete(client);
        if (room.size === 0) {
          sseRooms.delete(key);
        }
      }
    }
  };
}

/**
 * Broadcasts a real-time seat event to all connected browsers watching the showtime
 * and publishes to Redis pub/sub channel `ch:showtime:{showtimeId}`.
 *
 * @param {string[]} showtimeKeys - [dbShowtimeId, externalShowtimeId, rawShowtimeId]
 * @param {object} eventPayload
 */
export async function broadcastShowtimeSeatEvent(showtimeKeys, eventPayload) {
  const uniqueKeys = [...new Set(showtimeKeys.filter(Boolean))];
  const payloadWithTs = {
    ...eventPayload,
    timestamp: new Date().toISOString(),
  };
  const serialized = JSON.stringify(payloadWithTs);
  const visitedClients = new Set();

  for (const key of uniqueKeys) {
    const room = sseRooms.get(key);
    if (!room) continue;
    for (const client of room) {
      if (visitedClients.has(client)) continue;
      visitedClients.add(client);
      try {
        client.res.write(`event: seat_update\ndata: ${serialized}\n\n`);
      } catch (err) {
        logger.warn({ err: err.message }, '[Realtime] Failed writing to SSE client');
      }
    }
  }

  // Also publish to Redis pub/sub channel `ch:showtime:{id}`
  if (uniqueKeys[0]) {
    try {
      const redis = getRedisClient();
      await redis.publish(buildShowtimeChannel(uniqueKeys[0]), serialized);
    } catch {
      // Non-fatal if Redis is offline in unit test / local mode
    }
  }
}
