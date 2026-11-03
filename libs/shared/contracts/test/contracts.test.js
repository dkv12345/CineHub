import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  MAX_SEATS_PER_BOOKING,
  SEAT_HOLD_SECONDS,
  loginBody,
  lockSeatsSchema,
  paginationQuery,
  registerBody,
} from '../src/index.js';

describe('@cinehub/contracts schemas and constants', () => {
  it('exports domain constants and error codes', () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(MAX_SEATS_PER_BOOKING).toBe(6);
    expect(SEAT_HOLD_SECONDS).toBe(900);
  });

  it('validates pagination, auth, and seat lock payloads', () => {
    expect(paginationQuery.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(
      registerBody.safeParse({
        fullName: 'Nguyen Van A',
        email: 'a@cinehub.vn',
        password: 'password123',
      }).success,
    ).toBe(true);
    expect(
      loginBody.safeParse({
        email: 'a@cinehub.vn',
        password: 'password123',
      }).success,
    ).toBe(true);
    expect(
      lockSeatsSchema.safeParse({
        showtimeId: 'show-1',
        seatIds: ['A1', 'A2'],
      }).success,
    ).toBe(true);
  });
});
