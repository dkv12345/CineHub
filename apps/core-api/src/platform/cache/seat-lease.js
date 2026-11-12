import { randomUUID } from 'node:crypto';
import { SEAT_HOLD_SECONDS } from '@cinehub/contracts';
import { getRedisClient } from './redis.js';

export const SEAT_LEASE_TTL_SECONDS = SEAT_HOLD_SECONDS;

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

/**
 * Acquire Redis lease locks for a list of seats atomically.
 * All-or-nothing: if any seat is already locked, none are locked.
 *
 * @param {Object} params
 * @param {string} params.showtimeId
 * @param {string[]} params.seatIds
 * @param {string} params.userId
 * @param {string} [params.holdToken]
 * @param {number} [params.ttlSeconds]
 * @returns {Promise<{ success: boolean, holdToken?: string, expiresAt?: Date, conflicts?: string[] }>}
 */
export async function acquireSeatLeases({
  showtimeId,
  seatIds,
  userId,
  holdToken = randomUUID(),
  ttlSeconds = SEAT_LEASE_TTL_SECONDS,
}) {
  if (!seatIds || seatIds.length === 0) {
    return { success: true, holdToken, expiresAt: new Date(Date.now() + ttlSeconds * 1000) };
  }

  const redis = getRedisClient();
  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const leaseValue = `${userId}:${holdToken}`;
  const userHoldSetKey = buildUserHoldSetKey(showtimeId, userId);

  const args = [leaseValue, ttlSeconds.toString(), userHoldSetKey, ...seatIds];

  const rawResult = await redis.eval(ACQUIRE_SEAT_LEASES_LUA, keys.length, ...keys, ...args);

  const result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;

  if (!result.ok) {
    return {
      success: false,
      conflicts: result.conflicts || [],
    };
  }

  return {
    success: true,
    holdToken,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  };
}

/**
 * Release Redis lease locks for a list of seats belonging to a user.
 *
 * @param {Object} params
 * @param {string} params.showtimeId
 * @param {string[]} params.seatIds
 * @param {string} params.userId
 * @returns {Promise<number>} Number of seats released
 */
export async function releaseSeatLeases({ showtimeId, seatIds, userId }) {
  if (!seatIds || seatIds.length === 0) return 0;

  const redis = getRedisClient();
  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const userPrefix = `${userId}:`;
  const userHoldSetKey = buildUserHoldSetKey(showtimeId, userId);

  const args = [userPrefix, userHoldSetKey, ...seatIds];

  const releasedCount = await redis.eval(RELEASE_SEAT_LEASES_LUA, keys.length, ...keys, ...args);

  return Number(releasedCount);
}

/**
 * Check which seats among given seatIds are currently leased in Redis.
 *
 * @param {string} showtimeId
 * @param {string[]} seatIds
 * @returns {Promise<Map<string, { userId: string, holdToken: string }>>}
 */
export async function getActiveSeatLeases(showtimeId, seatIds) {
  const leaseMap = new Map();
  if (!seatIds || seatIds.length === 0) return leaseMap;

  const redis = getRedisClient();
  const keys = seatIds.map((seatId) => buildSeatLeaseKey(showtimeId, seatId));
  const values = await redis.mget(...keys);

  for (let i = 0; i < seatIds.length; i++) {
    const val = values[i];
    if (val) {
      const [uId, token] = val.split(':');
      leaseMap.set(seatIds[i], { userId: uId, holdToken: token });
    }
  }

  return leaseMap;
}
