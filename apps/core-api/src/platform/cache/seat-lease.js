import { SEAT_HOLD_SECONDS } from '@cinehub/contracts';

/**
 * Redis key pattern for atomic seat holds:
 * `seat:{showtime_id}:{seat_id}` -> `{user_id}:{timestamp}` (TTL: 900s)
 *
 * Acquisition command specification:
 * `SET seat:{showtime_id}:{seat_id} {user_id}:{timestamp} NX EX 900`
 */
export const SEAT_LEASE_TTL_SECONDS = SEAT_HOLD_SECONDS;

export function buildSeatLeaseKey(showtimeId, seatId) {
  return `seat:${showtimeId}:${seatId}`;
}

export function buildSeatLeaseValue(userId, timestamp = Date.now()) {
  return `${userId}:${timestamp}`;
}

/**
 * Atomic multi-seat lease acquisition Lua script specification (PLANNED).
 *
 * Ensures all requested seats in a booking are free before locking any of them
 * with `SET key value NX EX 900`.
 */
export const ACQUIRE_SEAT_LEASES_LUA = `
for i = 1, #KEYS do
  if redis.call("EXISTS", KEYS[i]) == 1 then
    return 0
  end
end
for i = 1, #KEYS do
  redis.call("SET", KEYS[i], ARGV[1], "NX", "EX", tonumber(ARGV[2]))
end
return 1
`;

/**
 * Atomic lease release Lua script specification (PLANNED).
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
 * @planned TODO(booking-module): Implement Redis seat lease acquisition when backend booking module is built.
 */
export async function acquireSeatLeases(_params) {
  // TODO(booking-module): Execute ACQUIRE_SEAT_LEASES_LUA against getRedisClient()
  throw new Error('NOT_IMPLEMENTED: Seat lease acquisition is planned (see ADR 0006)');
}

/**
 * @planned TODO(booking-module): Implement Redis seat lease release when backend booking module is built.
 */
export async function releaseSeatLeases(_params) {
  // TODO(booking-module): Execute RELEASE_SEAT_LEASES_LUA against getRedisClient()
  throw new Error('NOT_IMPLEMENTED: Seat lease release is planned (see ADR 0006)');
}
