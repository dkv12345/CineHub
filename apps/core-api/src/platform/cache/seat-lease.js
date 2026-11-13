import { randomUUID } from 'node:crypto';
import { SEAT_HOLD_SECONDS } from '@cinehub/contracts';
import { getRedisClient } from './redis.js';
import { logger } from '../observability/logger.js';

export const SEAT_LEASE_TTL_SECONDS = SEAT_HOLD_SECONDS;

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
  return `seat:{${showtimeId}}:${seatId}`;
}

export function buildUserHoldSetKey(showtimeId, userId) {
  return `hold-set:{${showtimeId}}:${userId}`;
}

export function buildSeatLeaseValue(userId, holdToken = randomUUID()) {
  return `${userId}:${holdToken}`;
}

export const ACQUIRE_SEAT_LEASES_LUA = `
local conflicts = {}
for i = 1, #KEYS do
  local val = redis.call("GET", KEYS[i])
  if val then
    table.insert(conflicts, ARGV[3 + i])
  end
end

if #conflicts > 0 then
  return cjson.encode({ ok = false, conflicts = conflicts })
end

for i = 1, #KEYS do
  redis.call("SET", KEYS[i], ARGV[1], "EX", tonumber(ARGV[2]))
  if ARGV[3] ~= "" then
    redis.call("SADD", ARGV[3], ARGV[3 + i])
  end
end

if ARGV[3] ~= "" then
  redis.call("EXPIRE", ARGV[3], tonumber(ARGV[2]))
end

return cjson.encode({ ok = true })
`;

export const RELEASE_SEAT_LEASES_LUA = `
local released = 0
for i = 1, #KEYS do
  local val = redis.call("GET", KEYS[i])
  if val and (string.sub(val, 1, #ARGV[1]) == ARGV[1] or ARGV[1] == "*") then
    redis.call("DEL", KEYS[i])
    released = released + 1
    if ARGV[2] ~= "" then
      redis.call("SREM", ARGV[2], ARGV[2 + i])
    end
  end
end
return released
`;

async function getConnectedRedis() {
  const redis = getRedisClient();
  if (redis.status === 'wait') {
    await redis.connect();
  }
  return redis;
}

/**
 * Acquire Redis lease locks for a list of seats atomically.
 * All-or-nothing: if any seat is already locked, none are locked.
 */
export async function acquireSeatLeases({
  showtimeId,
  seatIds,
  userId,
  holdToken = randomUUID(),
  ttlSeconds = SEAT_LEASE_TTL_SECONDS,
}) {
  if (!seatIds || seatIds.length === 0) {
    return {
      success: true,
      acquired: true,
      holdToken,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const leaseValue = buildSeatLeaseValue(userId, holdToken);
  const userHoldSetKey = buildUserHoldSetKey(showtimeId, userId);
  const args = [leaseValue, ttlSeconds.toString(), userHoldSetKey, ...seatIds];
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  try {
    const redis = await getConnectedRedis();
    const rawResult = await redis.eval(ACQUIRE_SEAT_LEASES_LUA, keys.length, ...keys, ...args);
    const result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;

    if (!result.ok) {
      return {
        success: false,
        acquired: false,
        conflicts: result.conflicts || [],
      };
    }

    return {
      success: true,
      acquired: true,
      holdToken,
      expiresAt,
    };
  } catch (err) {
    logger.warn({ err: err.message }, '[SeatLease] Redis unavailable, using atomic memory lease');
    cleanExpiredMemoryLeases();
    const conflicts = [];
    keys.forEach((k, idx) => {
      if (memoryLeases.has(k)) {
        conflicts.push(seatIds[idx]);
      }
    });
    if (conflicts.length > 0) {
      return { success: false, acquired: false, conflicts };
    }
    for (const k of keys) {
      memoryLeases.set(k, { value: leaseValue, expiresAt: expiresAt.getTime() });
    }
    return { success: true, acquired: true, holdToken, expiresAt };
  }
}

/**
 * Release Redis lease locks for a list of seats belonging to a user.
 */
export async function releaseSeatLeases({ showtimeId, seatIds, userId }) {
  if (!seatIds || seatIds.length === 0) return 0;

  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const userPrefix = `${userId}:`;
  const userHoldSetKey = buildUserHoldSetKey(showtimeId, userId);
  const args = [userPrefix, userHoldSetKey, ...seatIds];

  cleanExpiredMemoryLeases();
  let memReleased = 0;
  for (const k of keys) {
    const existing = memoryLeases.get(k);
    if (existing && (existing.value.startsWith(userPrefix) || userId === '*')) {
      memoryLeases.delete(k);
      memReleased++;
    }
  }

  try {
    const redis = await getConnectedRedis();
    const releasedCount = await redis.eval(RELEASE_SEAT_LEASES_LUA, keys.length, ...keys, ...args);
    return Number(releasedCount);
  } catch (err) {
    logger.warn({ err: err.message }, '[SeatLease] Redis release fallback to memory');
    return memReleased;
  }
}

/**
 * Force-deletes seat lease keys upon booking confirmation or hold expiry sweep.
 */
export async function forceDeleteSeatLeases({ showtimeId, seatIds }) {
  if (!seatIds?.length) return;
  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  for (const k of keys) {
    memoryLeases.delete(k);
  }
  try {
    const redis = await getConnectedRedis();
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err: err.message }, '[SeatLease] Redis force delete fallback');
  }
}

/**
 * Check which seats among given seatIds are currently leased in Redis.
 */
export async function getActiveSeatLeases(showtimeId, seatIds) {
  const leaseMap = new Map();
  if (!seatIds || seatIds.length === 0) return leaseMap;

  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));

  try {
    const redis = await getConnectedRedis();
    const values = await redis.mget(...keys);

    for (let i = 0; i < seatIds.length; i++) {
      const val = values[i];
      if (val) {
        const [uId, token] = val.split(':');
        leaseMap.set(seatIds[i], { userId: uId, holdToken: token });
      }
    }
    return leaseMap;
  } catch {
    cleanExpiredMemoryLeases();
    for (let i = 0; i < seatIds.length; i++) {
      const entry = memoryLeases.get(keys[i]);
      if (entry) {
        const [uId, token] = entry.value.split(':');
        leaseMap.set(seatIds[i], { userId: uId, holdToken: token });
      }
    }
    return leaseMap;
  }
}

/**
 * List all active Redis/memory seat leases for a showtime (used when DB showtimeSeats are absent, e.g. live external sessions).
 *
 * @param {string} showtimeId
 * @returns {Promise<Map<string, { userId: string, holdToken: string }>>}
 */
export async function getAllShowtimeSeatLeases(showtimeId) {
  const leaseMap = new Map();
  const prefix = `seat:{${showtimeId}}:`;

  try {
    const redis = await getConnectedRedis();
    const keys = await redis.keys(`${prefix}*`);
    if (!keys || keys.length === 0) return leaseMap;

    const values = await redis.mget(...keys);
    for (let i = 0; i < keys.length; i++) {
      const val = values[i];
      if (val) {
        const seatKey = keys[i].slice(prefix.length);
        const [uId, token] = val.split(':');
        leaseMap.set(seatKey, { userId: uId, holdToken: token });
      }
    }
    return leaseMap;
  } catch {
    cleanExpiredMemoryLeases();
    for (const [key, entry] of memoryLeases.entries()) {
      if (key.startsWith(prefix)) {
        const seatKey = key.slice(prefix.length);
        const [uId, token] = entry.value.split(':');
        leaseMap.set(seatKey, { userId: uId, holdToken: token });
      }
    }
    return leaseMap;
  }
}
