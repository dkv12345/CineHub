import { SEAT_HOLD_SECONDS } from '@cinehub/contracts';
import { env } from '../config/env.js';
import { getRedisClient } from './redis.js';
import { logger } from '../observability/logger.js';

/**
 * Redis key pattern for atomic seat holds:
 * `seat:{showtime_id}:{seat_id}` -> `{user_id}:{timestamp}` (TTL: env.SEAT_HOLD_TTL_SECONDS || 900s)
 */
export const SEAT_LEASE_TTL_SECONDS = env.SEAT_HOLD_TTL_SECONDS || SEAT_HOLD_SECONDS;

// In-memory fallback map when Redis is unavailable in local/unit test environments
const memoryLeases = new Map();

function cleanExpiredMemoryLeases() {
  const now = Date.now();
  for (const [k, entry] of memoryLeases.entries()) {
    if (entry.expiresAt <= now) {
      memoryLeases.delete(k);
    }
  }
}

export function buildSeatLeaseKey(showtimeId, seatId) {
  return `seat:${showtimeId}:${seatId}`;
}

export function buildSeatLeaseValue(userId, timestamp = Date.now()) {
  return `${userId}:${timestamp}`;
}

export function parseSeatLeaseValue(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const idx = raw.lastIndexOf(':');
  if (idx <= 0) return { userId: raw, timestamp: 0 };
  return {
    userId: raw.slice(0, idx),
    timestamp: Number(raw.slice(idx + 1)) || 0,
  };
}

/**
 * Atomic multi-seat lease acquisition Lua script.
 * Ensures all requested seats in a booking are either free or already held by the same user
 * before locking/refreshing all of them with `SET key value EX ttl`.
 */
export const ACQUIRE_SEAT_LEASES_LUA = `
for i = 1, #KEYS do
  local current = redis.call("GET", KEYS[i])
  if current and string.sub(current, 1, #ARGV[3]) ~= ARGV[3] then
    return 0
  end
end
for i = 1, #KEYS do
  redis.call("SET", KEYS[i], ARGV[1], "EX", tonumber(ARGV[2]))
end
return 1
`;

/**
 * Atomic lease release Lua script.
 * Releases seat keys only if owned by the requesting user prefix.
 */
export const RELEASE_SEAT_LEASES_LUA = `
local released = 0
for i = 1, #KEYS do
  local val = redis.call("GET", KEYS[i])
  if val and string.sub(val, 1, #ARGV[1]) == ARGV[1] then
    redis.call("DEL", KEYS[i])
    released = released + 1
  end
end
return released
`;

/**
 * Atomically acquires or refreshes leases for `seatIds` on `showtimeId` for `userId`.
 * @param {{ showtimeId: string, seatIds: string[], userId: string, ttlSeconds?: number }} params
 * @returns {Promise<{ acquired: boolean, ttlSeconds: number, expiresAt: Date }>}
 */
export async function acquireSeatLeases({ showtimeId, seatIds, userId, ttlSeconds }) {
  const ttl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : SEAT_LEASE_TTL_SECONDS;
  const sortedIds = [...new Set(seatIds.map((s) => String(s).trim()))].sort();
  const keys = sortedIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const now = Date.now();
  const leaseValue = buildSeatLeaseValue(userId, now);
  const ownerPrefix = `${userId}:`;
  const expiresAt = new Date(now + ttl * 1000);

  // Always update in-memory mirror as well for fast synchronous inspection & fallback
  cleanExpiredMemoryLeases();

  try {
    const redis = getRedisClient();
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const res = await redis.eval(
      ACQUIRE_SEAT_LEASES_LUA,
      keys.length,
      ...keys,
      leaseValue,
      String(ttl),
      ownerPrefix,
    );
    const acquired = Number(res) === 1;
    if (acquired) {
      for (const k of keys) {
        memoryLeases.set(k, { value: leaseValue, expiresAt: expiresAt.getTime() });
      }
    }
    return { acquired, ttlSeconds: ttl, expiresAt };
  } catch (err) {
    logger.warn({ err: err.message }, '[SeatLease] Redis unavailable, using atomic memory lease');
    for (const k of keys) {
      const existing = memoryLeases.get(k);
      if (existing && !existing.value.startsWith(ownerPrefix)) {
        return { acquired: false, ttlSeconds: ttl, expiresAt };
      }
    }
    for (const k of keys) {
      memoryLeases.set(k, { value: leaseValue, expiresAt: expiresAt.getTime() });
    }
    return { acquired: true, ttlSeconds: ttl, expiresAt };
  }
}

/**
 * Releases seat leases owned by `userId`.
 * @param {{ showtimeId: string, seatIds: string[], userId: string }} params
 * @returns {Promise<number>}
 */
export async function releaseSeatLeases({ showtimeId, seatIds, userId }) {
  if (!seatIds?.length) return 0;
  const sortedIds = [...new Set(seatIds.map((s) => String(s).trim()))].sort();
  const keys = sortedIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const ownerPrefix = `${userId}:`;

  cleanExpiredMemoryLeases();
  let memReleased = 0;
  for (const k of keys) {
    const existing = memoryLeases.get(k);
    if (existing && existing.value.startsWith(ownerPrefix)) {
      memoryLeases.delete(k);
      memReleased++;
    }
  }

  try {
    const redis = getRedisClient();
    const res = await redis.eval(RELEASE_SEAT_LEASES_LUA, keys.length, ...keys, ownerPrefix);
    return Number(res) || memReleased;
  } catch (err) {
    logger.warn({ err: err.message }, '[SeatLease] Redis release fallback to memory');
    return memReleased;
  }
}

/**
 * Force-deletes seat lease keys upon booking confirmation or hold expiry sweep.
 * @param {{ showtimeId: string, seatIds: string[] }} params
 */
export async function forceDeleteSeatLeases({ showtimeId, seatIds }) {
  if (!seatIds?.length) return;
  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  for (const k of keys) {
    memoryLeases.delete(k);
  }
  try {
    const redis = getRedisClient();
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err: err.message }, '[SeatLease] Redis force delete fallback');
  }
}

/**
 * Returns active Redis/memory leases for the given showtime and seat labels.
 * @param {string} showtimeId
 * @param {string[]} seatIds
 * @returns {Promise<Map<string, { userId: string, timestamp: number }>>}
 */
export async function getActiveSeatLeases(showtimeId, seatIds) {
  const result = new Map();
  if (!seatIds?.length) return result;
  cleanExpiredMemoryLeases();
  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));

  try {
    const redis = getRedisClient();
    const values = await redis.mget(...keys);
    values.forEach((raw, idx) => {
      if (raw) {
        const parsed = parseSeatLeaseValue(raw);
        if (parsed) result.set(seatIds[idx], parsed);
      }
    });
    return result;
  } catch {
    seatIds.forEach((seatId, idx) => {
      const entry = memoryLeases.get(keys[idx]);
      if (entry) {
        const parsed = parseSeatLeaseValue(entry.value);
        if (parsed) result.set(seatId, parsed);
      }
    });
    return result;
  }
}
